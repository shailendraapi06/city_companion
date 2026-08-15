from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.conversations.models import Conversation, Message
from apps.feedback.models import Feedback
from apps.places.models import Place
from apps.users.models import User


class FeedbackModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="reviewer@example.com",
            name="Reviewer User",
            password="password123",
        )
        self.conversation = Conversation.objects.create(user=self.user)
        self.message = Message.objects.create(
            conversation=self.conversation,
            role="assistant",
            content="Here is a place.",
        )
        self.place = Place.objects.create(
            name="City Hospital",
            category="hospital",
            latitude=Decimal("26.450000"),
            longitude=Decimal("80.330000"),
        )

    def test_feedback_with_optional_place(self):
        fb1 = Feedback.objects.create(
            user=self.user,
            message=self.message,
            type="up",
        )
        self.assertIsNone(fb1.place)
        self.assertIsNone(fb1.reason)

        fb2 = Feedback.objects.create(
            user=self.user,
            message=self.message,
            place=self.place,
            type="down",
            reason="too_expensive",
        )
        self.assertEqual(fb2.place, self.place)
        self.assertEqual(fb2.reason, "too_expensive")

    def test_invalid_type_or_reason_choices_rejected(self):
        fb_invalid_type = Feedback(
            user=self.user,
            message=self.message,
            type="invalid_type",
        )
        with self.assertRaises(ValidationError):
            fb_invalid_type.full_clean()

        fb_invalid_reason = Feedback(
            user=self.user,
            message=self.message,
            type="down",
            reason="invalid_reason",
        )
        with self.assertRaises(ValidationError):
            fb_invalid_reason.full_clean()

    def test_deleting_place_sets_feedback_place_to_null(self):
        fb = Feedback.objects.create(
            user=self.user,
            message=self.message,
            place=self.place,
            type="down",
            reason="too_far",
        )
        self.assertEqual(fb.place, self.place)

        self.place.delete()
        fb.refresh_from_db()
        self.assertIsNone(fb.place)
        self.assertEqual(Feedback.objects.count(), 1)


class FeedbackAPITests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken

        self.client = APIClient()
        self.user_a = User.objects.create_user(
            email="usera@example.com", name="User A", password="Password123!"
        )
        self.user_b = User.objects.create_user(
            email="userb@example.com", name="User B", password="Password123!"
        )

        self.conv_a = Conversation.objects.create(user=self.user_a)
        self.msg_a = Message.objects.create(
            conversation=self.conv_a, role="assistant", content="User A message response"
        )

        self.conv_b = Conversation.objects.create(user=self.user_b)
        self.msg_b = Message.objects.create(
            conversation=self.conv_b, role="assistant", content="User B message response"
        )

        self.place = Place.objects.create(
            name="Apollo Hospital",
            category="hospital",
            latitude=Decimal("26.450000"),
            longitude=Decimal("80.330000"),
        )

        self.token_a = str(RefreshToken.for_user(self.user_a).access_token)

    def test_submit_valid_feedback_success(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_a}")

        payload = {
            "message_id": str(self.msg_a.id),
            "place_id": str(self.place.id),
            "type": "down",
            "reason": "too_expensive",
        }
        response = self.client.post("/api/feedback/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["type"], "down")
        self.assertEqual(response.data["data"]["reason"], "too_expensive")

    def test_feedback_on_another_user_message_returns_404(self):
        # User A tries to give feedback on User B's message -> 404 NOT_FOUND
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_a}")

        payload = {
            "message_id": str(self.msg_b.id),
            "type": "up",
        }
        response = self.client.post("/api/feedback/", payload, format="json")
        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["code"], "NOT_FOUND")

    def test_invalid_type_or_reason_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token_a}")

        payload_bad_type = {
            "message_id": str(self.msg_a.id),
            "type": "invalid_type",
        }
        resp1 = self.client.post("/api/feedback/", payload_bad_type, format="json")
        self.assertEqual(resp1.status_code, 400)
        self.assertEqual(resp1.data["error"]["code"], "VALIDATION_ERROR")

        payload_bad_reason = {
            "message_id": str(self.msg_a.id),
            "type": "down",
            "reason": "invalid_reason_string",
        }
        resp2 = self.client.post("/api/feedback/", payload_bad_reason, format="json")
        self.assertEqual(resp2.status_code, 400)
        self.assertEqual(resp2.data["error"]["code"], "VALIDATION_ERROR")

    def test_unauthenticated_feedback_rejected(self):
        self.client.credentials()
        payload = {
            "message_id": str(self.msg_a.id),
            "type": "up",
        }
        response = self.client.post("/api/feedback/", payload, format="json")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"]["code"], "UNAUTHORIZED")

