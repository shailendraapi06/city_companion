from decimal import Decimal

from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

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


class SavedPlacesAPITests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(
            email="usera@example.com", name="User A", password="Password123!"
        )
        self.user_b = User.objects.create_user(
            email="userb@example.com", name="User B", password="Password123!"
        )

        self.cafe = Place.objects.create(
            name="Chai Point",
            category="cafe",
            latitude=Decimal("26.450000"),
            longitude=Decimal("80.330000"),
            price_range={"amount": 100, "unit": "person"},
            rating=Decimal("4.0"),
        )
        self.pg = Place.objects.create(
            name="Green PG",
            category="pg",
            latitude=Decimal("26.460000"),
            longitude=Decimal("80.340000"),
            price_range={"amount": 7000, "unit": "month"},
            rating=Decimal("4.6"),
        )

        # User A saves both Cafe and PG
        self.save_a_cafe = SavedPlace.objects.create(user=self.user_a, place=self.cafe)
        self.save_a_pg = SavedPlace.objects.create(user=self.user_a, place=self.pg)

        # User B saves only Cafe
        self.save_b_cafe = SavedPlace.objects.create(user=self.user_b, place=self.cafe)

    def test_get_saved_places_user_isolation(self):
        token_a = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

        response = self.client.get("/api/saved-places/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["count"], 2)

        # Authenticate as User B
        token_b = RefreshToken.for_user(self.user_b).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_b}")

        resp_b = self.client.get("/api/saved-places/")
        self.assertEqual(resp_b.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_b.data["data"]["count"], 1)
        self.assertEqual(resp_b.data["data"]["results"][0]["place"]["name"], "Chai Point")

    def test_get_saved_places_category_filter(self):
        token_a = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

        # Filter by ?category=pg
        response = self.client.get("/api/saved-places/?category=pg")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["count"], 1)
        self.assertEqual(response.data["data"]["results"][0]["place"]["category"], "pg")
        self.assertEqual(response.data["data"]["results"][0]["place"]["name"], "Green PG")

    def test_unauthenticated_saved_places_rejected(self):
        self.client.credentials()
        response = self.client.get("/api/saved-places/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])

