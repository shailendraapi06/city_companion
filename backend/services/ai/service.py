import json
import logging
import re

from services.ai.client import OpenAIClientWrapper
from services.ai.parser import AIValidationError, validate_and_normalize_ai_response
from services.ai.prompts import SYSTEM_PROMPT
from services.ai.tools import TOOLS_DEFINITIONS
from services.ai.verifier import verify_ai_output
from services.places.providers import PlaceCandidate, place_to_candidate
from services.places.service import PlaceSearchService, get_place_by_id
from services.recommendations.scoring import ScoringWeights
from services.recommendations.service import RecommendationEngine

logger = logging.getLogger(__name__)

MAX_EXPLANATION_ATTEMPTS = 2

NO_STRONG_MATCH_NOTE = (
    "Note: No places strongly matched the exact budget/location criteria. "
    "Kindly inform the user gracefully and suggest expanding their budget or search radius."
)


class AIUnavailableError(Exception):
    """Raised when BOTH the AI client AND the deterministic data fallback fail
    (API_Specification.md §5.6). The HTTP layer maps this to 503 AI_UNAVAILABLE."""


# Emergency fast-path constants (PRD §6.4 FR14/FR15, APP_FLOW.md §11).
DEFAULT_KANPUR_LAT = 26.4499
DEFAULT_KANPUR_LON = 80.3319

EMERGENCY_HOSPITAL_RADIUS_KM = 15.0
EMERGENCY_TOP_N = 5
EMERGENCY_WEIGHTS = ScoringWeights(
    distance=50.0, requirement=10.0, budget=10.0, rating=15.0, quality=15.0
)

EMERGENCY_INTENT_KEYWORDS = (
    "accident", "emergency", "urgent", "ambulance",
    "heart attack", "chest pain", "heavy bleeding", "unconscious",
    "injured", "injury", "burning", "drowning", "suicide",
    "fire", "robbery", "thief", "assault", "stabbed", "attacked",
    "mujhe bachao", "bachao", "madad karo", "accident ho gaya",
    "medical emergency", "emergency ho gayi",
)

EMERGENCY_CONTACTS = [
    {"label": "National Emergency Helpline", "number": "112"},
    {"label": "Police", "number": "100"},
    {"label": "Ambulance", "number": "102"},
]

EMERGENCY_DISCLAIMER = (
    "If this is an emergency, contact local emergency services immediately — "
    "Dial 112 (National Emergency), 100 (Police), 102 (Ambulance). "
    "City Companion is not a substitute for professional emergency services."
)

# Deterministic keyword → category inference used ONLY by the §5.6 AI-unavailable
# fallback, so data retrieval can still produce useful ranked results without AI.
_CATEGORY_KEYWORDS = {
    "pg": "pg", "hostel": "pg", "mess": "pg",
    "hotel": "hotel",
    "cafe": "cafe",
    "restaurant": "restaurant", "food": "restaurant",
    "hospital": "hospital",
    "pharmacy": "pharmacy",
}


class AIService:
    """
    Orchestration Engine for City Companion AI pipeline.
    Wires Places Search (5A) + Recommendation Engine (5B) + AI Foundations (5C).

    Enforces Golden Rules #1 & #3 from Prompt 0:
      - The AI never queries the DB directly — this orchestration is the only
        code that calls PlaceSearchService (5A).
      - The AI never has final ranking authority — ranking is deterministic
        (5B) and the AI only explains the top-N it was given.
      - The AI only ever sees the pre-filtered top-N candidate list (never a
        raw dump), and every explanation it produces is mechanically verified
        against that exact list by services/ai/verifier.py (Fix 1) before it
        can be returned. Schema failures and hallucination failures both
        trigger exactly ONE re-prompt with specific feedback, then fall back
        to a non-AI summary built only from real candidate data (Fix 3).

    Ref: TRD.md §9.1, §9.3, §9.6; AI_Build_Prompts_Phase5.md Prompt 5D.
    """

    def __init__(
        self,
        client=None,
        places_service=None,
        rec_engine=None,
        include_external: bool = True,
    ):
        self.client = client or OpenAIClientWrapper()
        self.places_service = places_service or PlaceSearchService()
        self.rec_engine = rec_engine or RecommendationEngine()
        # Tests run against the internal-data path only; the external provider
        # (Nominatim) requires live network calls and is skipped there.
        self.include_external = include_external

    def process_user_message(
        self,
        user_message: str,
        history: list[dict] | None = None,
        user_profile: dict | None = None,
        top_n: int = 5,
        location: dict | None = None,
    ) -> dict:
        """
        Executes end-to-end pipeline:
          1. Assemble conversation context (recent-history window + profile +
             optional GPS location).
          2. Initial AI call with tools definitions.
          3. Process tool calls strictly via PlaceSearchService (5A) &
             RecommendationEngine (5B) — all four tools execute real functions.
          4. Feed pre-filtered top-N ranked places to AI for explanation.
          5. Schema-validate + mechanically verify (verifier.py) the AI's
             output, retrying once with specific feedback before falling back
             to a plain non-AI summary built from the real candidates.

        `location` (optional {lat, lng}, from the browser-geolocation field in
        the §5.1 request) is surfaced to the model so its search tool calls can
        carry user_lat/user_lon; the deterministic forced-search path uses it
        directly. Passing None (tests, offline) keeps prior behavior unchanged.
        """
        # 0. Emergency fast-path (PRD §6.4, APP_FLOW.md §11): deterministic,
        #    verified-data-only response surfaced BEFORE any AI call, so it never
        #    depends on AI availability and carries zero room for hallucination.
        if self._detect_emergency(user_message):
            return self._build_emergency_response(location)

        # 1. Assemble context
        messages = self._assemble_context(user_message, history, user_profile, location)

        # 2. Initial AI call. If the AI client itself is unavailable (§5.6),
        #    fall back to a deterministic DB-only path. Only if that data path
        #    ALSO fails do we raise AIUnavailableError (→ 503 at the HTTP layer).
        try:
            ai_resp = self.client.create_chat_completion(
                messages=messages,
                tools=TOOLS_DEFINITIONS,
            )
        except Exception as exc:
            logger.warning("AI planning call failed (%s); using deterministic DB fallback.", exc)
            return self._ai_unavailable_fallback(user_message, location)

        choice = ai_resp.get("choices", [{}])[0]
        message_obj = choice.get("message", {})
        tool_calls = message_obj.get("tool_calls", [])

        # If the AI didn't request a tool call, attempt to detect a search
        # intent deterministically and force a search_places execution.
        if not tool_calls:
            tool_calls = self._forced_tool_call_if_search_implied(user_message, location)

        if tool_calls:
            return self._handle_tool_calls_and_explain(
                messages, message_obj, tool_calls, user_message, top_n
            )

        # Purely conversational response
        raw_text = message_obj.get("content") or "How can I help you discover places in your city today?"
        fallback_payload = {
            "message": {"role": "assistant"},
            "content": [{"type": "text", "content": raw_text}],
        }
        return validate_and_normalize_ai_response(fallback_payload)

    def _forced_tool_call_if_search_implied(self, user_message: str, location: dict | None = None) -> list[dict]:
        search_query_implied = any(
            term in user_message.lower()
            for term in ["pg", "hostel", "hotel", "cafe", "restaurant", "hospital", "food", "budget", "near"]
        )
        if search_query_implied:
            args = {"city": "Kanpur"}
            if location and location.get("lat") is not None and location.get("lng") is not None:
                args["user_lat"] = float(location["lat"])
                args["user_lon"] = float(location["lng"])
            return [
                {
                    "id": "forced_call_1",
                    "type": "function",
                    "function": {
                        "name": "search_places",
                        "arguments": json.dumps(args),
                    },
                }
            ]
        return []

    def _detect_emergency(self, user_message: str) -> bool:
        """Keyword-based emergency-intent detection (PRD §6.4, APP_FLOW.md §11).

        Detected the same way as any other intent — no separate mode toggle.
        A documented MVP heuristic: strong emergency/medical-distress signals
        (English + Hindi/Hinglish) trigger the deterministic emergency path."""
        if not user_message:
            return False
        text = user_message.lower()
        return any(keyword in text for keyword in EMERGENCY_INTENT_KEYWORDS)

    def _build_emergency_response(self, location: dict | None = None) -> dict:
        """Fast-path emergency response built ONLY from verified data.

        Nearest hospitals (real candidates) ranked by distance, static emergency
        contacts, Directions/Call/Share-Location actions, and a clear disclaimer.
        The payload is schema-validated AND run through the SAME mechanical
        grounding check as every normal response (Fix 1 — deliberately not
        relaxed). If grounding ever fails, we fall back to a claim-free
        contacts-only payload rather than risk hallucinating facility details.
        """
        lat = DEFAULT_KANPUR_LAT
        lon = DEFAULT_KANPUR_LON
        if location and location.get("lat") is not None and location.get("lng") is not None:
            lat = float(location["lat"])
            lon = float(location["lng"])

        candidates = self.places_service.search(
            category="hospital",
            city="Kanpur",
            user_lat=lat,
            user_lon=lon,
            max_radius_km=EMERGENCY_HOSPITAL_RADIUS_KM,
            include_external=self.include_external,
        )
        scored = self.rec_engine.recommend(
            candidates,
            max_radius_km=EMERGENCY_HOSPITAL_RADIUS_KM,
            weights=EMERGENCY_WEIGHTS,
        )
        top = scored[:EMERGENCY_TOP_N]
        candidate_pool = {sc.candidate.place_id: sc.candidate for sc in top}
        data = [self._scored_candidate_to_data(sc) for sc in top]

        contacts_items = [f"{c['label']}: {c['number']}" for c in EMERGENCY_CONTACTS]
        blocks = [
            {"type": "alert", "level": "danger", "content": EMERGENCY_DISCLAIMER},
            {
                "type": "text",
                "content": (
                    "This looks like an emergency. The nearest hospitals from our "
                    "verified data are listed below — please contact emergency "
                    "services first."
                ),
            },
        ]
        if data:
            blocks.append({"type": "recommendation", "items": data})

        blocks.append({"type": "text", "content": "Emergency contacts (India):"})
        blocks.append({"type": "list", "items": contacts_items})

        if data:
            first = data[0]
            blocks.append(
                {
                    "type": "action",
                    "label": "Directions to nearest hospital",
                    "action_type": "directions",
                    "payload": {"lat": first["latitude"], "lng": first["longitude"]},
                }
            )
            nearest = top[0].candidate
            if nearest.phone:
                blocks.append(
                    {
                        "type": "action",
                        "label": "Call nearest hospital",
                        "action_type": "call",
                        "payload": {"phone": nearest.phone},
                    }
                )
        for contact in EMERGENCY_CONTACTS:
            blocks.append(
                {
                    "type": "action",
                    "label": f"Call {contact['label']} ({contact['number']})",
                    "action_type": "call",
                    "payload": {"phone": contact["number"]},
                }
            )
        blocks.append(
            {
                "type": "action",
                "label": "Share my current location",
                "action_type": "share_location",
                "payload": {"lat": lat, "lng": lon},
            }
        )

        payload = {"message": {"role": "assistant"}, "content": blocks}
        validated = validate_and_normalize_ai_response(payload)

        result = verify_ai_output(validated, candidate_pool)
        if not result.ok:
            logger.error("Emergency response failed grounding verification: %s", result.errors)
            validated = validate_and_normalize_ai_response(
                {
                    "message": {"role": "assistant"},
                    "content": [
                        {"type": "alert", "level": "danger", "content": EMERGENCY_DISCLAIMER},
                        {"type": "text", "content": "Emergency contacts (India):"},
                        {"type": "list", "items": contacts_items},
                        {
                            "type": "action",
                            "label": "Share my current location",
                            "action_type": "share_location",
                            "payload": {"lat": lat, "lng": lon},
                        },
                    ],
                }
            )
        return validated

    def _ai_unavailable_fallback(self, user_message: str, location: dict | None) -> dict:
        """§5.6: AI client is down but Phase 5A/5B still work — return a 200-style
        payload of raw ranked results plus an 'AI temporarily unavailable' alert.

        Deterministic intent/budget inference replaces the AI's requirement
        extraction. If the data path ALSO fails (DB down), raise AIUnavailableError
        so the HTTP layer can return the only-legal hard error: 503 AI_UNAVAILABLE."""
        args = self._infer_search_params(user_message, location)
        try:
            _pool, candidates_data, _note = self._execute_search(args, user_message, top_n=5)
        except Exception as exc:
            logger.error("AI unavailable AND data retrieval failed: %s", exc)
            raise AIUnavailableError(
                "AI service is temporarily unavailable and no fallback data "
                "could be retrieved."
            ) from exc
        no_match = not candidates_data or all(
            c.get("match_score", 0) < 35.0 for c in candidates_data
        )
        return self._build_fallback_structured_response(
            candidates_data, no_match=no_match, ai_unavailable=True
        )

    def _infer_search_params(self, user_message: str, location: dict | None) -> dict:
        """Best-effort deterministic requirement inference for the §5.6 fallback:
        category + budget + user coords, with Kanpur as the default city."""
        text = (user_message or "").lower()
        args: dict = {"city": "Kanpur"}
        if location and location.get("lat") is not None and location.get("lng") is not None:
            args["user_lat"] = float(location["lat"])
            args["user_lon"] = float(location["lng"])
        for keyword, category in _CATEGORY_KEYWORDS.items():
            if keyword in text:
                args["category"] = category
                break
        budget = self._infer_budget(text)
        if budget is not None:
            args["max_budget"] = budget
        return args

    def _infer_budget(self, text: str) -> float | None:
        match = re.search(r"₹?\s*(\d{3,6})\b", text)
        if not match:
            return None
        amount = float(match.group(1))
        if 200.0 <= amount <= 200000.0:
            return amount
        return None

    def _assemble_context(
        self,
        user_message: str,
        history: list[dict] | None = None,
        user_profile: dict | None = None,
        location: dict | None = None,
    ) -> list[dict]:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if user_profile:
            profile_str = f"User Profile Context: Preferred City={user_profile.get('preferred_city', 'Kanpur')}, Language={user_profile.get('language', 'en')}"
            messages.append({"role": "system", "content": profile_str})

        if location and location.get("lat") is not None and location.get("lng") is not None:
            messages.append(
                {
                    "role": "system",
                    "content": (
                        f"Current user location (browser geolocation): lat={location['lat']}, "
                        f"lng={location['lng']}. Pass these as user_lat/user_lon when calling "
                        "search_places or search_nearby so distance ranking uses the user's real position."
                    ),
                }
            )

        # Recent N messages window (e.g. last 6 messages)
        if history:
            recent_window = history[-6:]
            for msg in recent_window:
                if isinstance(msg, dict) and "role" in msg and "content" in msg:
                    messages.append({"role": msg["role"], "content": msg["content"]})

        messages.append({"role": "user", "content": user_message})
        return messages

    def _handle_tool_calls_and_explain(
        self,
        messages: list[dict],
        assistant_msg: dict,
        tool_calls: list[dict],
        user_query: str,
        top_n: int,
    ) -> dict:
        messages.append(assistant_msg)

        # Pool of REAL candidate objects the AI is allowed to reference. This is
        # the exact set verifier.py cross-checks the AI's output against.
        candidate_pool: dict[str, PlaceCandidate] = {}
        # Serialized search-result data (with score/rank) used for fallbacks.
        candidates_data: list[dict] = []
        search_ran = False

        for call in tool_calls:
            func = call.get("function", {})
            name = func.get("name")
            args_str = func.get("arguments", "{}")

            try:
                args = json.loads(args_str) if isinstance(args_str, str) else (args_str or {})
            except Exception:
                args = {}
            if not isinstance(args, dict):
                args = {}

            if name in ("search_places", "search_nearby"):
                search_ran = True
                pool, data, priority_note = self._execute_search(args, user_query, top_n)
                candidate_pool.update(pool)
                candidates_data.extend(data)
                if priority_note:
                    messages.append({"role": "system", "content": priority_note})
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id", "call_1"),
                        "content": json.dumps(
                            {"status": "success", "count": len(data), "places": data}
                        ),
                    }
                )
            elif name == "get_place_details":
                pool, tool_result = self._execute_get_place_details(args)
                candidate_pool.update(pool)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id", "call_1"),
                        "content": json.dumps(tool_result),
                    }
                )
            elif name == "compare_places":
                pool, tool_result = self._execute_compare_places(args)
                candidate_pool.update(pool)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id", "call_1"),
                        "content": json.dumps(tool_result),
                    }
                )
            else:
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id", "call_1"),
                        "content": json.dumps(
                            {"status": "error", "message": f"Unknown tool '{name}'."}
                        ),
                    }
                )

        # Handle No-Strong-Match case (APP_FLOW.md §10)
        is_no_strong_match = False
        if search_ran:
            is_no_strong_match = not candidates_data or all(
                c.get("match_score", 0) < 35.0 for c in candidates_data
            )
            if is_no_strong_match:
                messages.append({"role": "system", "content": NO_STRONG_MATCH_NOTE})

        return self._explain_and_validate(
            messages=messages,
            candidates_by_id=candidate_pool,
            candidates_data=candidates_data,
            no_match=is_no_strong_match,
        )

    def _execute_search(
        self,
        args: dict,
        user_query: str,
        top_n: int,
    ) -> tuple[dict[str, PlaceCandidate], list[dict], str | None]:
        category = args.get("category")
        city = args.get("city") or "Kanpur"
        max_budget = args.get("max_budget")
        max_radius_km = args.get("max_radius_km") or args.get("radius_km")
        food_required = bool(args.get("food_required"))
        user_lat = args.get("user_lat") or args.get("latitude") or args.get("lat")
        user_lon = args.get("user_lon") or args.get("longitude") or args.get("lng")

        weights, priority_note = self._determine_weights(user_query, args)

        # 5A: Fetch candidate places (real data only).
        candidates = self.places_service.search(
            category=category,
            city=city,
            user_lat=user_lat,
            user_lon=user_lon,
            max_budget=max_budget,
            max_radius_km=max_radius_km,
            food_required=food_required,
            include_external=self.include_external,
        )

        # 5B: Deterministic Scoring & Ranking (no AI involved).
        scored_ranked = self.rec_engine.recommend(
            candidates=candidates,
            max_budget=max_budget,
            required_amenities=["food"] if food_required else None,
            max_radius_km=max_radius_km,
            weights=weights,
        )

        # HARD CAP: enforce top-N limit (Golden Rule #1).
        top_n_candidates = scored_ranked[:top_n]

        candidate_pool = {sc.candidate.place_id: sc.candidate for sc in top_n_candidates}
        candidates_data = [self._scored_candidate_to_data(sc) for sc in top_n_candidates]
        return candidate_pool, candidates_data, priority_note

    def _execute_get_place_details(self, args: dict) -> tuple[dict[str, PlaceCandidate], dict]:
        place_id = (args.get("place_id") or "").strip()
        if not place_id:
            return {}, {"status": "error", "message": "Missing required parameter 'place_id'."}

        place = get_place_by_id(place_id)
        if place is None:
            return {}, {"status": "not_found", "message": f"Place '{place_id}' was not found in the database."}

        candidate = place_to_candidate(place)
        return (
            {candidate.place_id: candidate},
            {"status": "success", "count": 1, "places": [self._candidate_to_data(candidate)]},
        )

    def _execute_compare_places(self, args: dict) -> tuple[dict[str, PlaceCandidate], dict]:
        place_ids = args.get("place_ids") or []
        if not isinstance(place_ids, list) or not place_ids:
            return {}, {"status": "error", "message": "Missing or invalid parameter 'place_ids' (expected a list)."}

        candidate_pool: dict[str, PlaceCandidate] = {}
        found: list[dict] = []
        missing: list[str] = []

        for place_id in [str(pid).strip() for pid in place_ids[:4]]:
            place = get_place_by_id(place_id)
            if place is None:
                missing.append(place_id)
                continue
            candidate = place_to_candidate(place)
            candidate_pool[candidate.place_id] = candidate
            found.append(self._candidate_to_data(candidate))

        tool_result = {"status": "success", "count": len(found), "places": found}
        if missing:
            tool_result["missing"] = missing
        return candidate_pool, tool_result

    def _determine_weights(self, user_query: str, args: dict) -> tuple[ScoringWeights | None, str | None]:
        """
        Determines whether to apply priority weight overrides (TRD.md §10.3).
        Returns (weights_override_or_None, priority_note_for_the_AI_or_None).
        """
        query_l = (user_query or "").lower()
        if "location" in query_l or "distance" in query_l or "nearby" in query_l or "close" in query_l or "nearest" in query_l:
            return (
                ScoringWeights(distance=50.0, budget=10.0, requirement=20.0, rating=10.0, quality=10.0),
                "User priority override: the user has stated that LOCATION/distance matters more than price. "
                "Re-rank with distance-weighted scoring and explicitly acknowledge this priority change in your explanation.",
            )
        if "cheap" in query_l or "budget" in query_l or "price" in query_l:
            return (
                ScoringWeights(budget=50.0, distance=10.0, requirement=20.0, rating=10.0, quality=10.0),
                "User priority override: the user has stated that BUDGET/price matters more than other factors. "
                "Re-rank with budget-weighted scoring and explicitly acknowledge this priority change in your explanation.",
            )
        return None, None

    def _explain_and_validate(
        self,
        messages: list[dict],
        candidates_by_id: dict[str, PlaceCandidate],
        candidates_data: list[dict],
        no_match: bool,
    ) -> dict:
        """
        Second AI call to generate the structured explanation, then:
          1. parse JSON,
          2. schema-validate via parser.py (5C),
          3. mechanically verify grounding against candidates via verifier.py (Fix 1).

        On failure of either check, exactly ONE re-prompt happens with specific
        feedback about what was wrong (Fix 3). If the retry also fails, fall
        back to a plain non-AI structured summary built only from real data —
        which trivially passes both checks. Malformed/ungrounded output is
        NEVER returned to the caller.
        """
        for attempt in range(1, MAX_EXPLANATION_ATTEMPTS + 1):
            try:
                explanation_resp = self.client.create_chat_completion(
                    messages=messages,
                    response_format={"type": "json_object"},
                )
                raw_content = explanation_resp["choices"][0]["message"]["content"]
                parsed_payload = json.loads(raw_content)
            except Exception as exc:
                logger.warning(f"AI explanation call/JSON parse failed (attempt {attempt}): {exc}")
                if attempt < MAX_EXPLANATION_ATTEMPTS:
                    messages.append(
                        {
                            "role": "system",
                            "content": self._schema_feedback_message(
                                "Your previous attempt could not be parsed as a valid JSON object. Return a single JSON object with 'message' and 'content' keys."
                            ),
                        }
                    )
                    continue
                return self._build_fallback_structured_response(candidates_data, no_match, ai_unavailable=True)

            # 1) Schema validation (5C parser).
            try:
                validated = validate_and_normalize_ai_response(parsed_payload)
            except AIValidationError as exc:
                if attempt < MAX_EXPLANATION_ATTEMPTS:
                    messages.append(
                        {"role": "system", "content": self._schema_feedback_message(str(exc))}
                    )
                    continue
                return self._build_fallback_structured_response(candidates_data, no_match, ai_unavailable=True)

            # 2) Mechanical hallucination check (verifier.py) — UNSKIPPABLE.
            result = verify_ai_output(validated, candidates_by_id)
            if not result.ok:
                if attempt < MAX_EXPLANATION_ATTEMPTS:
                    messages.append(
                        {"role": "system", "content": self._grounding_feedback_message(result.errors)}
                    )
                    continue
                return self._build_fallback_structured_response(candidates_data, no_match, ai_unavailable=True)

            return validated

        return self._build_fallback_structured_response(candidates_data, no_match, ai_unavailable=True)

    def _schema_feedback_message(self, detail: str) -> str:
        return (
            "Your previous response was rejected by the response schema validator. "
            f"Specific problem: {detail} "
            "Return a single JSON object with 'message' and 'content' keys, using only the "
            "allowed content block types and the exact field shapes documented in your system "
            "prompt. Do not repeat the previous mistake."
        )

    def _grounding_feedback_message(self, errors: list[str]) -> str:
        return (
            "Your previous response contained ungrounded claims. The following references did not "
            "match the real candidate data you were given: "
            + "; ".join(errors)
            + " Only reference places and facts that appear verbatim in the tool results you "
            "received. Do not invent place IDs, names, prices, ratings, or amenities. "
            "Do not repeat the previous mistake."
        )

    def _candidate_to_data(self, candidate: PlaceCandidate) -> dict:
        """Serializes a real PlaceCandidate for the AI (and fallback) without score/rank."""
        return {
            "place_id": candidate.place_id,
            "name": candidate.name,
            "category": candidate.category,
            "address": candidate.address,
            "latitude": candidate.latitude,
            "longitude": candidate.longitude,
            "price_range": candidate.price_range,
            "rating": candidate.rating,
            "amenities": candidate.amenities or [],
            "distance_km": candidate.distance_km,
            "source": candidate.source,
            "verified": candidate.verified,
        }

    def _scored_candidate_to_data(self, sc) -> dict:
        data = self._candidate_to_data(sc.candidate)
        data.update(
            {
                "match_score": sc.score.total,
                "rank": sc.rank,
                "reason": sc.score.reason,
                "score_breakdown": {
                    "budget": sc.score.budget,
                    "requirement": sc.score.requirement,
                    "distance": sc.score.distance,
                    "rating": sc.score.rating,
                    "quality": sc.score.quality,
                },
            }
        )
        return data

    def _build_fallback_structured_response(
        self, candidates_data: list[dict], no_match: bool, ai_unavailable: bool = False
    ) -> dict:
        """
        Generates a guaranteed-valid structured block payload as fallback.

        Built ONLY from real candidate data (candidates_data originates from
        real PlaceCandidate objects), so it passes both the schema validator
        and verifier.py trivially. No AI text generation happens here.
        """
        blocks = []
        if no_match or not candidates_data:
            blocks.append(
                {
                    "type": "alert",
                    "level": "info",
                    "content": "We couldn't find exact matches for your budget/radius. Consider adjusting your search filters.",
                }
            )
            blocks.append(
                {
                    "type": "text",
                    "content": "I couldn't find any places matching those exact criteria in our verified database. Try increasing your maximum budget or expanding your preferred radius.",
                }
            )
        else:
            blocks.append(
                {
                    "type": "text",
                    "content": f"I found {len(candidates_data)} matching place(s). Here are the closest options from the available data:",
                }
            )
            blocks.append(
                {
                    "type": "recommendation",
                    "items": candidates_data,
                }
            )
            if ai_unavailable:
                blocks.append(
                    {
                        "type": "alert",
                        "level": "warning",
                        "content": "AI-generated explanations are temporarily unavailable, so I'm showing the closest ranked results directly from our verified data.",
                    }
                )
            blocks.append(
                {
                    "type": "alert",
                    "level": "warning",
                    "content": "Prices and availability may have changed. Please confirm with the place before booking.",
                }
            )

        fallback_payload = {
            "message": {"role": "assistant"},
            "content": blocks,
        }
        return validate_and_normalize_ai_response(fallback_payload)
