from dataclasses import dataclass
from services.places.providers import PlaceCandidate
from services.recommendations.scoring import ScoreBreakdown


@dataclass
class ScoredCandidate:
    """A scored candidate place with attached rank position (1, 2, 3...)."""

    candidate: PlaceCandidate
    score: ScoreBreakdown
    rank: int = 0


def rank_candidates(
    scored_pairs: list[tuple[PlaceCandidate, ScoreBreakdown]]
) -> list[ScoredCandidate]:
    """
    Ranks scored candidates in descending order by total score.
    Tie-breaking hierarchy:
      1. score.total (highest first)
      2. rating (highest rating wins)
      3. distance_km (closest distance wins)
      4. verified (verified status wins)
    Ref: TRD.md §10.3
    """

    def tie_break_key(pair: tuple[PlaceCandidate, ScoreBreakdown]):
        cand, score = pair
        total_score = score.total
        rating_val = float(cand.rating) if cand.rating is not None else 0.0
        # For distance: closer distance is better, so negate distance (None gets -999999)
        dist_val = -float(cand.distance_km) if cand.distance_km is not None else -999999.0
        verified_val = 1 if cand.verified else 0

        return (total_score, rating_val, dist_val, verified_val)

    sorted_pairs = sorted(scored_pairs, key=tie_break_key, reverse=True)

    ranked_list: list[ScoredCandidate] = []
    for idx, (cand, score) in enumerate(sorted_pairs, start=1):
        ranked_list.append(ScoredCandidate(candidate=cand, score=score, rank=idx))

    return ranked_list
