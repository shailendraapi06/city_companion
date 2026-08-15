from decimal import Decimal
from django.test import TestCase

from apps.places.models import Place
from services.location.distance import haversine_distance
from services.places.filters import (
    apply_place_filters,
    filter_by_budget,
    filter_by_category,
    filter_by_distance,
    filter_by_food_required,
)
from services.places.providers import (
    InternalDatabaseProvider,
    PlaceCandidate,
)
from services.places.service import PlaceSearchService


class PlaceSearchServiceAndFiltersTests(TestCase):
    def setUp(self):
        # Seed test places
        self.pg1 = Place.objects.create(
            name="Alpha PG Kanpur",
            category="pg",
            address="Kakadeo, Kanpur",
            latitude=Decimal("26.478000"),
            longitude=Decimal("80.301000"),
            price_range={"amount": 6000, "unit": "month"},
            amenities=["wifi", "food"],
            attributes={"food_included": True},
            rating=Decimal("4.5"),
        )
        self.pg2 = Place.objects.create(
            name="Beta PG Kanpur",
            category="pg",
            address="Kakadeo, Kanpur",
            latitude=Decimal("26.480000"),
            longitude=Decimal("80.305000"),
            price_range={"amount": 9000, "unit": "month"},
            amenities=["wifi"],
            attributes={"food_included": False},
            rating=Decimal("4.0"),
        )
        self.cafe1 = Place.objects.create(
            name="Corner Cafe Kanpur",
            category="cafe",
            address="Swaroop Nagar, Kanpur",
            latitude=Decimal("26.473000"),
            longitude=Decimal("80.320000"),
            price_range={"amount": 250, "unit": "person"},
            amenities=["coffee", "wifi"],
            rating=Decimal("4.2"),
        )

        self.search_service = PlaceSearchService()

    def test_haversine_distance_calculation(self):
        # Distance between Kakadeo (26.478, 80.301) and Swaroop Nagar (26.473, 80.320) ~ 1.9 km
        dist = haversine_distance(26.478, 80.301, 26.473, 80.320)
        self.assertGreater(dist, 1.0)
        self.assertLess(dist, 3.0)

    def test_category_filter(self):
        candidates = InternalDatabaseProvider().search()
        pg_only = filter_by_category(candidates, "pg")
        self.assertEqual(len(pg_only), 2)
        self.assertTrue(all(c.category == "pg" for c in pg_only))

    def test_budget_filter(self):
        candidates = InternalDatabaseProvider().search()
        under_7000 = filter_by_budget(candidates, max_budget=7000)
        # Should include Alpha PG (6000) and Corner Cafe (250), exclude Beta PG (9000)
        names = {c.name for c in under_7000}
        self.assertIn("Alpha PG Kanpur", names)
        self.assertIn("Corner Cafe Kanpur", names)
        self.assertNotIn("Beta PG Kanpur", names)

    def test_distance_filter(self):
        # Kakadeo center: 26.478, 80.301
        candidates = InternalDatabaseProvider().search(
            user_lat=26.478, user_lon=80.301
        )
        # Radius 1.0 km should include Alpha PG & Beta PG, exclude Corner Cafe (1.9 km away)
        within_1km = filter_by_distance(candidates, max_radius_km=1.0)
        names = {c.name for c in within_1km}
        self.assertIn("Alpha PG Kanpur", names)
        self.assertNotIn("Corner Cafe Kanpur", names)

    def test_food_required_filter(self):
        candidates = InternalDatabaseProvider().search()
        with_food = filter_by_food_required(candidates, food_required=True)
        names = {c.name for c in with_food}
        self.assertIn("Alpha PG Kanpur", names)
        self.assertNotIn("Beta PG Kanpur", names)

    def test_deduplication_prefers_internal_over_external(self):
        internal_cand = PlaceCandidate(
            place_id="int_1",
            name="Corner Cafe Kanpur",
            category="cafe",
            latitude=26.473000,
            longitude=80.320000,
            source="internal",
            verified=True,
        )
        external_cand_same_name = PlaceCandidate(
            place_id="ext_100",
            name="Corner Cafe Kanpur",
            category="cafe",
            latitude=26.473010,
            longitude=80.320010,
            source="external_places_api",
        )

        deduped = self.search_service._deduplicate(
            [internal_cand], [external_cand_same_name]
        )
        self.assertEqual(len(deduped), 1)
        self.assertEqual(deduped[0].source, "internal")

    def test_place_search_service_combined(self):
        results = self.search_service.search(
            category="pg",
            max_budget=7000,
            food_required=True,
            include_external=False,  # Test deterministic internal path
        )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].name, "Alpha PG Kanpur")
