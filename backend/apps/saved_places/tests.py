from decimal import Decimal

from django.db import IntegrityError
from django.test import TestCase

from apps.places.models import Place
from apps.saved_places.models import SavedPlace
from apps.users.models import User


class SavedPlaceModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="saver@example.com",
            name="Saver User",
            password="password123",
        )
        self.place = Place.objects.create(
            name="Test Cafe",
            category="cafe",
            latitude=Decimal("26.450000"),
            longitude=Decimal("80.330000"),
        )

    def test_saved_place_creation_and_uniqueness(self):
        saved = SavedPlace.objects.create(user=self.user, place=self.place)
        self.assertEqual(saved.user, self.user)
        self.assertEqual(saved.place, self.place)

        with self.assertRaises(IntegrityError):
            SavedPlace.objects.create(user=self.user, place=self.place)
