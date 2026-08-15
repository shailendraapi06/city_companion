from django.http import Http404
from django.test import TestCase
from rest_framework.exceptions import NotFound
from rest_framework.test import APIRequestFactory

from apps.conversations.models import Conversation, Message
from apps.feedback.models import Feedback
from apps.places.models import Place
from apps.saved_places.models import SavedPlace
from apps.users.models import User
from common.permissions import IsOwner, get_owned_object_or_404


class OwnershipPermissionsTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user_a = User.objects.create_user(
            email="user_a@example.com",
            name="User A",
            password="Password123!",
        )
        self.user_b = User.objects.create_user(
            email="user_b@example.com",
            name="User B",
            password="Password123!",
        )

        self.place = Place.objects.create(
            name="Sample Place",
            address="123 Street",
            latitude=26.45,
            longitude=80.33,
        )

        self.conv_a = Conversation.objects.create(
            user=self.user_a,
            title="User A Conversation",
            city="Kanpur",
        )
        self.msg_a = Message.objects.create(
            conversation=self.conv_a,
            role="user",
            content="Hello from User A",
        )
        self.saved_a = SavedPlace.objects.create(
            user=self.user_a,
            place=self.place,
        )
        self.feedback_a = Feedback.objects.create(
            user=self.user_a,
            message=self.msg_a,
            place=self.place,
            type="up",
        )

    def test_get_owned_object_or_404_allows_owner(self):
        conv = get_owned_object_or_404(Conversation, self.user_a, id=self.conv_a.id)
        self.assertEqual(conv, self.conv_a)

        saved = get_owned_object_or_404(SavedPlace, self.user_a, id=self.saved_a.id)
        self.assertEqual(saved, self.saved_a)

        fb = get_owned_object_or_404(Feedback, self.user_a, id=self.feedback_a.id)
        self.assertEqual(fb, self.feedback_a)

        msg = get_owned_object_or_404(
            Message, self.user_a, user_field="conversation__user", id=self.msg_a.id
        )
        self.assertEqual(msg, self.msg_a)

    def test_get_owned_object_or_404_raises_404_for_different_user(self):
        with self.assertRaises(Http404):
            get_owned_object_or_404(Conversation, self.user_b, id=self.conv_a.id)

        with self.assertRaises(Http404):
            get_owned_object_or_404(SavedPlace, self.user_b, id=self.saved_a.id)

        with self.assertRaises(Http404):
            get_owned_object_or_404(Feedback, self.user_b, id=self.feedback_a.id)

        with self.assertRaises(Http404):
            get_owned_object_or_404(
                Message, self.user_b, user_field="conversation__user", id=self.msg_a.id
            )

    def test_is_owner_permission_class(self):
        permission = IsOwner()

        request_a = self.factory.get("/")
        request_a.user = self.user_a

        request_b = self.factory.get("/")
        request_b.user = self.user_b

        # Owner succeeds
        self.assertTrue(permission.has_object_permission(request_a, None, self.conv_a))
        self.assertTrue(permission.has_object_permission(request_a, None, self.msg_a))

        # Non-owner raises NotFound (404)
        with self.assertRaises(NotFound):
            permission.has_object_permission(request_b, None, self.conv_a)

        with self.assertRaises(NotFound):
            permission.has_object_permission(request_b, None, self.msg_a)
