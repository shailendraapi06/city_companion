from dataclasses import dataclass
from services.places.providers import PlaceCandidate


@dataclass
class ScoringWeights:
    """
    Configurable weights for recommendation scoring (sums to 100).
    Default Weight Profile (Decision Made):
      - budget: 30.0
      - requirement: 25.0
      - distance: 20.0
      - rating: 15.0
      - quality: 10.0
    """

    budget: float = 30.0
    requirement: float = 25.0
    distance: float = 20.0
    rating: float = 15.0
    quality: float = 10.0


@dataclass
class ScoreBreakdown:
    """Detailed factor breakdown for a candidate score."""

    budget: float
    requirement: float
    distance: float
    rating: float
    quality: float
    total: float
    reason: str


def score_candidate(
    candidate: PlaceCandidate,
    max_budget: float | None = None,
    required_amenities: list[str] | None = None,
    max_radius_km: float | None = None,
    weights: ScoringWeights | None = None,
) -> ScoreBreakdown:
    """
    Calculates a deterministic 0-100 score for a candidate place based on configurable weights.
    Ref: TRD.md §10.2
    """
    w = weights or ScoringWeights()

    # 1. Budget Factor (0.0 to w.budget)
    budget_score = w.budget
    if max_budget is not None and max_budget > 0:
        if candidate.price_range and "amount" in candidate.price_range:
            try:
                price = float(candidate.price_range["amount"])
                if price <= max_budget:
                    budget_score = w.budget
                else:
                    over_ratio = (price - max_budget) / max_budget
                    budget_score = max(0.0, (1.0 - over_ratio)) * w.budget
            except (ValueError, TypeError):
                budget_score = w.budget * 0.5
        else:
            budget_score = w.budget * 0.5

    # 2. Requirement Factor (0.0 to w.requirement)
    req_score = w.requirement
    if required_amenities:
        cand_amenities = {a.lower() for a in candidate.amenities}
        cand_attrs = {str(k).lower(): v for k, v in candidate.attributes.items()}
        matched = 0
        for req in required_amenities:
            req_l = req.lower()
            if req_l in cand_amenities or cand_attrs.get(req_l) is True:
                matched += 1
        req_score = (matched / len(required_amenities)) * w.requirement

    # 3. Distance Factor (0.0 to w.distance)
    dist_score = w.distance * 0.5
    radius = max_radius_km if (max_radius_km and max_radius_km > 0) else 5.0
    if candidate.distance_km is not None:
        if candidate.distance_km <= 1.0:
            dist_score = w.distance
        else:
            ratio = (candidate.distance_km - 1.0) / radius
            dist_score = max(0.0, (1.0 - ratio)) * w.distance

    # 4. Rating Factor (0.0 to w.rating)
    if candidate.rating is not None:
        rating_score = (min(5.0, max(0.0, float(candidate.rating))) / 5.0) * w.rating
    else:
        rating_score = w.rating * 0.6

    # 5. Quality / Verification Factor (0.0 to w.quality)
    quality_score = 0.0
    if candidate.verified:
        quality_score += w.quality * 0.6
    if candidate.images:
        quality_score += w.quality * 0.2
    if candidate.phone or candidate.website:
        quality_score += w.quality * 0.2
    quality_score = min(w.quality, quality_score)

    total = round(budget_score + req_score + dist_score + rating_score + quality_score, 1)

    # Human-readable reason breakdown string
    reasons = []
    if budget_score >= w.budget * 0.9:
        reasons.append("fits your budget perfectly")
    elif budget_score > 0:
        reasons.append("reasonably priced")

    if candidate.distance_km is not None and candidate.distance_km <= 2.0:
        reasons.append(f"close by ({candidate.distance_km:.1f} km)")

    if candidate.rating and float(candidate.rating) >= 4.5:
        reasons.append(f"top-rated ({candidate.rating}★)")

    if candidate.verified:
        reasons.append("verified place")

    reason_str = ", ".join(reasons) if reasons else "Matches your search criteria"

    return ScoreBreakdown(
        budget=round(budget_score, 1),
        requirement=round(req_score, 1),
        distance=round(dist_score, 1),
        rating=round(rating_score, 1),
        quality=round(quality_score, 1),
        total=total,
        reason=reason_str,
    )
