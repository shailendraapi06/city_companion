from services.places.providers import PlaceCandidate
from services.recommendations.ranking import ScoredCandidate, rank_candidates
from services.recommendations.scoring import ScoreBreakdown, ScoringWeights, score_candidate


class RecommendationEngine:
    """
    Deterministic Recommendation Engine.
    Scores and ranks candidates based on budget, requirements, distance, rating,
    and quality weights.
    Ref: TRD.md §10.2, §10.3
    """

    def recommend(
        self,
        candidates: list[PlaceCandidate],
        max_budget: float | None = None,
        required_amenities: list[str] | None = None,
        max_radius_km: float | None = None,
        weights: ScoringWeights | None = None,
    ) -> list[ScoredCandidate]:
        """
        Scores each candidate and returns a ranked list of ScoredCandidate objects.
        Accepts optional `weights` parameter for priority reweighting.
        """
        if not candidates:
            return []

        scored_pairs: list[tuple[PlaceCandidate, ScoreBreakdown]] = []
        for candidate in candidates:
            score = score_candidate(
                candidate=candidate,
                max_budget=max_budget,
                required_amenities=required_amenities,
                max_radius_km=max_radius_km,
                weights=weights,
            )
            scored_pairs.append((candidate, score))

        return rank_candidates(scored_pairs)
