import time
import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.places.models import Place
from apps.saved_places.models import SavedPlace
from apps.users.models import User


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


class PlaceAPITests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(
            email="usera@example.com", name="User A", password="Password123!"
        )
        self.user_b = User.objects.create_user(
            email="userb@example.com", name="User B", password="Password123!"
        )

        self.place1 = Place.objects.create(
            name="Cafe Coffee Day",
            category="cafe",
            address="Mall Road, Kanpur",
            latitude=Decimal("26.467000"),
            longitude=Decimal("80.350000"),
            price_range={"amount": 300, "unit": "person"},
            rating=Decimal("4.2"),
        )
        self.place2 = Place.objects.create(
            name="Kanpur Central Hotel",
            category="hotel",
            address="Station Road, Kanpur",
            latitude=Decimal("26.450000"),
            longitude=Decimal("80.340000"),
            price_range={"amount": 2500, "unit": "night"},
            rating=Decimal("4.5"),
        )

    def test_get_place_detail_is_saved_computed_per_user(self):
        # User B saves Place 1
        SavedPlace.objects.create(user=self.user_b, place=self.place1)

        # Authenticate as User A
        token_a = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

        response = self.client.get(f"/api/places/{self.place1.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertFalse(response.data["data"]["is_saved"])  # User A has not saved it

        # Now User A saves Place 1
        SavedPlace.objects.create(user=self.user_a, place=self.place1)

        response = self.client.get(f"/api/places/{self.place1.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["data"]["is_saved"])  # Now User A has saved it

    def test_get_place_detail_nonexistent_returns_404(self):
        token = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        fake_uuid = uuid.uuid4()
        response = self.client.get(f"/api/places/{fake_uuid}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["code"], "NOT_FOUND")

    def test_save_place_idempotent_behavior(self):
        token = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # First save -> 201 Created
        resp1 = self.client.post(f"/api/places/{self.place1.id}/save/")
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp1.data["success"])
        self.assertEqual(resp1.data["data"]["place_id"], str(self.place1.id))

        # Second save -> 200 OK (idempotent)
        resp2 = self.client.post(f"/api/places/{self.place1.id}/save/")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data["success"])
        self.assertEqual(resp2.data["data"]["place_id"], str(self.place1.id))

    def test_save_nonexistent_place_returns_404(self):
        token = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        fake_uuid = uuid.uuid4()
        resp = self.client.post(f"/api/places/{fake_uuid}/save/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(resp.data["error"]["code"], "NOT_FOUND")

    def test_unsave_place_success_and_404_when_not_saved(self):
        token_a = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

        # Save Place 1 for User A
        SavedPlace.objects.create(user=self.user_a, place=self.place1)

        # Unsave Place 1 -> 204 No Content
        resp_unsave = self.client.delete(f"/api/places/{self.place1.id}/save/")
        self.assertEqual(resp_unsave.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SavedPlace.objects.filter(user=self.user_a, place=self.place1).exists())

        # Unsave again (now not saved) -> 404 NOT_FOUND
        resp_unsave_again = self.client.delete(f"/api/places/{self.place1.id}/save/")
        self.assertEqual(resp_unsave_again.status_code, status.HTTP_404_NOT_FOUND)

    def test_unsave_place_saved_by_another_user_returns_404(self):
        # User B saves Place 1
        SavedPlace.objects.create(user=self.user_b, place=self.place1)

        # User A tries to unsave Place 1 -> returns 404 NOT_FOUND
        token_a = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_a}")

        resp = self.client.delete(f"/api/places/{self.place1.id}/save/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(SavedPlace.objects.filter(user=self.user_b, place=self.place1).exists())

