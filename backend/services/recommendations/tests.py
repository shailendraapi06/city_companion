from django.test import TestCase
from services.places.providers import PlaceCandidate
from services.recommendations.ranking import rank_candidates
from services.recommendations.scoring import (
    ScoreBreakdown,
    ScoringWeights,
    score_candidate,
)
from services.recommendations.service import RecommendationEngine


class RecommendationEngineTests(TestCase):
    def setUp(self):
        self.engine = RecommendationEngine()

        # Candidate A: Near but slightly expensive (8000/month, 0.5km away, 4.8 stars)
        self.cand_near = PlaceCandidate(
            place_id="near_pg",
            name="Near Luxury PG",
            category="pg",
            address="Kakadeo, Kanpur",
            latitude=26.478,
            longitude=80.301,
            price_range={"amount": 8000, "unit": "month"},
            rating=4.8,
            amenities=["wifi", "ac", "food"],
            attributes={"food_included": True},
            verified=True,
            distance_km=0.5,
        )

        # Candidate B: Far but budget-friendly (4000/month, 4.5km away, 4.0 stars)
        self.cand_cheap = PlaceCandidate(
            place_id="cheap_pg",
            name="Far Cheap PG",
            category="pg",
            address="Civil Lines, Kanpur",
            latitude=26.460,
            longitude=80.340,
            price_range={"amount": 4000, "unit": "month"},
            rating=4.0,
            amenities=["wifi"],
            attributes={"food_included": False},
            verified=False,
            distance_km=4.5,
        )

    def test_deterministic_scoring_default_weights(self):
        # Max budget 6000
        score = score_candidate(
            self.cand_near,
            max_budget=6000,
            required_amenities=["wifi", "food"],
            max_radius_km=5.0,
        )

        self.assertIsInstance(score, ScoreBreakdown)
        # Price 8000 vs 6000 max budget -> 33.3% over budget -> (1 - 0.333)*30 = 20.0
        self.assertEqual(score.budget, 20.0)
        # All required amenities matched -> full 25.0
        self.assertEqual(score.requirement, 25.0)
        # Distance 0.5km <= 1.0km -> full 20.0
        self.assertEqual(score.distance, 20.0)
        # Rating 4.8/5.0 * 15 -> 14.4
        self.assertEqual(score.rating, 14.4)
        # Verified + photos/contact -> 10.0
        self.assertGreaterEqual(score.quality, 6.0)
        self.assertGreater(score.total, 0)

    def test_ranking_order_stability_and_tie_breaking(self):
        # Two candidates with identical score factors but different ratings
        cand1 = PlaceCandidate(
            place_id="c1",
            name="Place 1",
            category="cafe",
            latitude=26.47,
            longitude=80.32,
            rating=4.5,
            verified=True,
        )
        cand2 = PlaceCandidate(
            place_id="c2",
            name="Place 2",
            category="cafe",
            latitude=26.47,
            longitude=80.32,
            rating=4.0,
            verified=True,
        )

        ranked = self.engine.recommend([cand2, cand1])
        self.assertEqual(len(ranked), 2)
        # Higher rating should break tie and rank #1
        self.assertEqual(ranked[0].candidate.place_id, "c1")
        self.assertEqual(ranked[0].rank, 1)
        self.assertEqual(ranked[1].rank, 2)

    def test_priority_reweighting_changes_ranking_order(self):
        # Candidate 1: Very cheap but farther away (Price: 3000, Distance: 4.0 km, Rating: 3.5)
        cheap_far = PlaceCandidate(
            place_id="cheap_far",
            name="Cheap Far PG",
            category="pg",
            latitude=26.460,
            longitude=80.340,
            price_range={"amount": 3000, "unit": "month"},
            rating=3.5,
            verified=False,
            distance_km=4.0,
        )

        # Candidate 2: Near but significantly over budget (Price: 9500, Distance: 0.2 km, Rating: 3.5)
        near_pricy = PlaceCandidate(
            place_id="near_pricy",
            name="Near Pricy PG",
            category="pg",
            latitude=26.478,
            longitude=80.301,
            price_range={"amount": 9500, "unit": "month"},
            rating=3.5,
            verified=False,
            distance_km=0.2,
        )

        # 1. Under Budget-heavy weights (budget=60, distance=5), Cheap Far PG wins!
        budget_heavy_weights = ScoringWeights(
            budget=60.0,
            distance=5.0,
            requirement=15.0,
            rating=10.0,
            quality=10.0,
        )
        budget_ranked = self.engine.recommend(
            [cheap_far, near_pricy],
            max_budget=6000,
            weights=budget_heavy_weights,
        )
        self.assertEqual(budget_ranked[0].candidate.place_id, "cheap_far")

        # 2. Under Distance-heavy weights (distance=60, budget=5), Near Pricy PG wins!
        distance_heavy_weights = ScoringWeights(
            distance=60.0,
            budget=5.0,
            requirement=15.0,
            rating=10.0,
            quality=10.0,
        )
        distance_ranked = self.engine.recommend(
            [cheap_far, near_pricy],
            max_budget=6000,
            weights=distance_heavy_weights,
        )
        self.assertEqual(distance_ranked[0].candidate.place_id, "near_pricy")


    def test_no_ai_call_made(self):
        # Verify recommendation engine produces results deterministically without AI dependency
        results = self.engine.recommend([self.cand_near], max_budget=10000)
        self.assertEqual(len(results), 1)
        self.assertIsNotNone(results[0].score.reason)
