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
