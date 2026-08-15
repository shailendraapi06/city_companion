import time
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.places.models import Place


class PlaceModelTests(TestCase):
    def test_place_category_choices_validation(self):
        valid_place = Place(
            name="Valid Hotel",
            category="hotel",
            latitude=Decimal("26.449900"),
            longitude=Decimal("80.331900"),
            source="admin_entered",
        )
        valid_place.full_clean()
        valid_place.save()

        invalid_place = Place(
            name="Invalid Category Place",
            category="invalid_category",
            latitude=Decimal("26.449900"),
            longitude=Decimal("80.331900"),
        )
        with self.assertRaises(ValidationError):
            invalid_place.full_clean()

    def test_place_verified_and_source_and_last_updated(self):
        place = Place.objects.create(
            name="PG Sunrise",
            category="pg",
            latitude=Decimal("26.450000"),
            longitude=Decimal("80.330000"),
            source="internal",
            verified=True,
            attributes={"food_included": True, "curfew": "10 PM"},
        )
        self.assertTrue(place.verified)
        self.assertEqual(place.source, "internal")
        self.assertEqual(place.attributes["food_included"], True)

        initial_last_updated = place.last_updated
        time.sleep(0.01)
        place.name = "PG Sunrise Updated"
        place.save()
        self.assertGreater(place.last_updated, initial_last_updated)
