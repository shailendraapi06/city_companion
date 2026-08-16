"""
Mechanical hallucination-control verifier for the AI service pipeline.

This is the POST-GENERATION, PRE-RETURN verification step required by the
Phase 5 gate (AI_Build_Prompts_Phase5.md, Prompt 5D) and Golden Rule #1
(LLM != data source) from Prompt 0.  A system-prompt instruction is NOT
enough: this module enforces grounding against the EXACT candidate list
that was passed to the model for this call.

Design notes
------------
- Cross-checks are made by PLACE ID against the real candidate objects
  (``PlaceCandidate``) the orchestration handed to the model — never by
  fuzzy name matching, which is easy to fool.
- Structured ``recommendation`` / ``place`` items that carry a ``place_id``
  are verified field-by-field (name, category, price, rating, amenities)
  against the corresponding real candidate object.
- An item in a place-like block WITHOUT a ``place_id`` is itself a
  grounding failure: a real candidate is always referenced by ID, so an
  ID-less item is either fabricated or unverifiable.
- Prose text is scanned for UUID tokens; any UUID that is not one of the
  provided candidate IDs is a grounding failure.
- ``comparison`` blocks carry no ``place_id`` in the documented schema, so
  their headers are verified by exact (normalized) match against candidate
  names, with a small allow-list of generic column labels. Row-level cell
  facts inside ``comparison`` blocks are not fact-checked — documented
  limitation; the airtight checks are the ID + structured-fact checks on
  ``recommendation``/``place`` blocks.

The orchestration layer (``services/ai/service.py``) calls
``verify_ai_output`` on EVERY AI-generated payload before it is returned,
and treats a non-``ok`` result as a hallucination failure (retry once, then
fall back to a non-AI summary built only from real candidate data).

Ref: TRD.md §3.3, §9.5; API_Specification.md §5.4; Backend_Schema.md §9.3.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from services.places.providers import PlaceCandidate

logger = __import__("logging").getLogger(__name__)

UUID_RE = re.compile(
    r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
    re.IGNORECASE,
)

# Block types whose items are place objects (PlaceResult per Backend_Schema §9.3).
PLACE_ITEM_BLOCK_TYPES = {"recommendation", "place"}

# Generic comparison column labels the model may legitimately use that are
# not themselves place references.
GENERIC_COMPARISON_LABELS = {
    "feature",
    "criteria",
    "details",
    "aspect",
    "place",
    "option",
    "options",
    "name",
    "price",
    "rating",
    "distance",
    "amenities",
    "category",
    "why",
    "note",
    "notes",
    "recommendation",
    "our pick",
}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


@dataclass
class PlaceReference:
    """A place the model asserted in its structured output."""

    place_id: str | None
    name: str | None = None
    category: str | None = None
    price_amount: float | None = None
    rating: float | None = None
    amenities: list[str] | None = None
    block_index: int | None = None
    block_type: str | None = None


@dataclass
class VerificationResult:
    """Result of verifying an AI payload against the real candidate set."""

    ok: bool
    errors: list[str] = field(default_factory=list)
    references: list[PlaceReference] = field(default_factory=list)


def _walk(value: Any, path: tuple[str, ...]):
    """Yield (path, value) for every node in a JSON-like structure."""
    if isinstance(value, dict):
        for key, sub in value.items():
            yield from _walk(sub, path + (str(key),))
    elif isinstance(value, list):
        for idx, sub in enumerate(value):
            yield from _walk(sub, path + (str(idx),))
    else:
        yield path, value


def extract_place_references(payload: dict) -> list[PlaceReference]:
    """Collect every place reference the AI payload actually makes."""
    references: list[PlaceReference] = []
    content = payload.get("content", []) if isinstance(payload, dict) else []

    for idx, block in enumerate(content):
        if not isinstance(block, dict):
            continue
        block_type = block.get("type")

        if block_type in PLACE_ITEM_BLOCK_TYPES:
            items = block.get("items")
            if isinstance(items, list):
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    references.append(
                        PlaceReference(
                            place_id=str(item["place_id"]) if item.get("place_id") is not None else None,
                            name=str(item["name"]) if item.get("name") is not None else None,
                            category=str(item["category"]) if item.get("category") is not None else None,
                            price_amount=_float_or_none(
                                item.get("price_range", {}).get("amount")
                                if isinstance(item.get("price_range"), dict)
                                else None
                            ),
                            rating=_float_or_none(item.get("rating")),
                            amenities=list(item["amenities"]) if isinstance(item.get("amenities"), list) else None,
                            block_index=idx,
                            block_type=block_type,
                        )
                    )

        if block_type == "comparison":
            headers = block.get("headers", [])
            if isinstance(headers, list):
                for header in headers:
                    if isinstance(header, str) and header.strip():
                        references.append(
                            PlaceReference(
                                place_id=None,
                                name=header.strip(),
                                block_index=idx,
                                block_type=block_type,
                            )
                        )

    return references


def _text_uuid_references(payload: dict) -> list[str]:
    """Collect UUID tokens mentioned anywhere in the payload's string values."""
    uuids: list[str] = []
    for _path, value in _walk(payload, ()):
        if isinstance(value, str):
            uuids.extend(UUID_RE.findall(value))
    return uuids


def verify_ai_output(
    payload: dict,
    candidates_by_id: dict[str, PlaceCandidate],
) -> VerificationResult:
    """
    Verify an AI payload against the exact candidate list it was given.

    Args:
        payload: The AI's (schema-validated) structured payload.
        candidates_by_id: Map of real candidate place_id -> PlaceCandidate
            object that was passed to the model for this call.

    Returns:
        VerificationResult with ``ok=False`` and specific error messages when
        any place reference or asserted fact is not grounded in the real
        candidate data.
    """
    errors: list[str] = []
    references = extract_place_references(payload)

    for ref in references:
        if ref.block_type == "comparison":
            if ref.name is None:
                continue
            label = _normalize(ref.name)
            if label in GENERIC_COMPARISON_LABELS:
                continue
            matching = [
                cand.place_id
                for cand in candidates_by_id.values()
                if _normalize(cand.name or "") == label
            ]
            if not matching:
                errors.append(
                    f"comparison header '{ref.name}' does not match any candidate "
                    "place name in the provided tool results."
                )
            continue

        if not ref.place_id:
            errors.append(
                f"{ref.block_type} block (index {ref.block_index}) contains an item "
                "without a 'place_id'. Every item must reference a real candidate by "
                "its place_id."
            )
            continue

        if ref.place_id not in candidates_by_id:
            errors.append(
                f"references place_id '{ref.place_id}' (in a {ref.block_type} block) "
                "which was NOT in the candidate list provided to you."
            )
            continue

        cand = candidates_by_id[ref.place_id]

        if ref.name is not None and _normalize(ref.name) != _normalize(cand.name or ""):
            errors.append(
                f"asserts name '{ref.name}' for place '{ref.place_id}'; the real "
                f"candidate name is '{cand.name}'."
            )
        if ref.category is not None and _normalize(ref.category) != _normalize(cand.category or ""):
            errors.append(
                f"asserts category '{ref.category}' for place '{ref.place_id}'; the "
                f"real candidate category is '{cand.category}'."
            )
        if ref.price_amount is not None:
            real_amount = _float_or_none(
                cand.price_range.get("amount") if isinstance(cand.price_range, dict) else None
            )
            if real_amount is None or abs(ref.price_amount - real_amount) > 0.01:
                errors.append(
                    f"asserts price {ref.price_amount} for place '{ref.place_id}'; the "
                    f"real candidate price is {real_amount}."
                )
        if ref.rating is not None:
            real_rating = _float_or_none(cand.rating)
            if real_rating is None or abs(ref.rating - real_rating) > 0.01:
                errors.append(
                    f"asserts rating {ref.rating} for place '{ref.place_id}'; the real "
                    f"candidate rating is {real_rating}."
                )
        if ref.amenities:
            real_amenities = {a.lower() for a in (cand.amenities or [])}
            for amenity in ref.amenities:
                if str(amenity).lower() not in real_amenities:
                    errors.append(
                        f"asserts amenity '{amenity}' for place '{ref.place_id}', which "
                        "is not among the candidate's real amenities."
                    )

    for uuid in _text_uuid_references(payload):
        if uuid.lower() not in candidates_by_id:
            errors.append(
                f"text mentions place_id '{uuid}' which is NOT in the candidate list "
                "provided to you."
            )

    return VerificationResult(ok=not errors, errors=errors, references=references)


def verify_payload_against_candidates(
    payload: dict,
    candidates: list[PlaceCandidate],
) -> VerificationResult:
    """Convenience wrapper accepting a candidate list instead of a dict."""
    return verify_ai_output(payload, {c.place_id: c for c in candidates})
