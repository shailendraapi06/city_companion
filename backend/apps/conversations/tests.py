import uuid
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.conversations.models import Conversation, Message
from apps.users.models import User


class ConversationAndMessageModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="convuser@example.com",
            name="Conversation User",
            password="password123",
        )

    def test_create_conversation_with_null_title_and_city(self):
        conversation = Conversation.objects.create(user=self.user)
        self.assertEqual(conversation.user, self.user)
        self.assertIsNone(conversation.title)
        self.assertIsNone(conversation.city)
        self.assertIn("Conversation", str(conversation))

    def test_message_role_choices_validation(self):
        conversation = Conversation.objects.create(
            user=self.user, title="PG in Kanpur", city="Kanpur"
        )
        valid_message = Message(
            conversation=conversation,
            role="user",
            content="Kanpur mein PG chahiye",
        )
        valid_message.full_clean()
        valid_message.save()

        invalid_message = Message(
            conversation=conversation,
            role="invalid_role",
            content="Hello",
        )
        with self.assertRaises(ValidationError):
            invalid_message.full_clean()

    def test_response_data_json_round_trip(self):
        conversation = Conversation.objects.create(user=self.user, city="Kanpur")
        nested_payload = {
            "message": {"role": "assistant"},
            "content": [
                {
                    "type": "text",
                    "content": "I found 3 matching options in Kanpur.",
                },
                {
                    "type": "recommendation",
                    "items": [
                        {
                            "place_id": "123e4567-e89b-12d3-a456-426614174000",
                            "name": "PG C",
                            "category": "pg",
                            "price_range": {"amount": 6000, "unit": "month"},
                            "rating": 4.5,
                            "distance_km": 0.7,
                            "match_score": 92,
                            "rank": 1,
                            "reason": "Closest to college with food included",
                            "tags": ["wifi", "food"],
                            "actions": ["view_details", "directions", "call", "save"],
                            "source": "internal",
                            "verified": True,
                            "last_updated": "2026-08-15",
                        }
                    ],
                },
            ],
        }

        msg = Message.objects.create(
            conversation=conversation,
            role="assistant",
            content="I found 3 matching options in Kanpur.",
            response_data=nested_payload,
        )

        retrieved_msg = Message.objects.get(id=msg.id)
        self.assertEqual(retrieved_msg.response_data, nested_payload)
        self.assertEqual(
            retrieved_msg.response_data["content"][1]["items"][0]["name"], "PG C"
        )

    def test_messages_ordered_by_created_at(self):
        conversation = Conversation.objects.create(user=self.user)
        msg1 = Message.objects.create(
            conversation=conversation, role="user", content="First message"
        )
        msg2 = Message.objects.create(
            conversation=conversation, role="assistant", content="Second message"
        )
        msg3 = Message.objects.create(
            conversation=conversation, role="user", content="Third message"
        )

        messages = list(conversation.messages.all())
        self.assertEqual(messages, [msg1, msg2, msg3])

    def test_deleting_conversation_cascades_to_messages(self):
        conversation = Conversation.objects.create(user=self.user)
        Message.objects.create(
            conversation=conversation, role="user", content="Test message"
        )
        self.assertEqual(Message.objects.count(), 1)

        conversation.delete()
        self.assertEqual(Message.objects.count(), 0)


class ConversationAPITests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(
            email="usera@example.com", name="User A", password="Password123!"
        )
        self.user_b = User.objects.create_user(
            email="userb@example.com", name="User B", password="Password123!"
        )

        self.conv_a = Conversation.objects.create(
            user=self.user_a, title="User A Chat", city="Kanpur"
        )
        self.conv_b = Conversation.objects.create(
            user=self.user_b, title="User B Chat", city="Lucknow"
        )

        self.msg_a1 = Message.objects.create(
            conversation=self.conv_a, role="user", content="First user message"
        )
        self.msg_a2 = Message.objects.create(
            conversation=self.conv_a,
            role="assistant",
            content="Assistant reply",
            response_data={"type": "text", "content": "Assistant reply"},
        )

    def test_list_conversations_user_isolation(self):
        token = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get("/api/conversations/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["count"], 1)
        self.assertEqual(response.data["data"]["results"][0]["id"], str(self.conv_a.id))
        self.assertEqual(response.data["data"]["results"][0]["city"], "Kanpur")

    def test_create_conversation_associates_authenticated_user(self):
        token = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        payload = {"city": "Delhi"}
        response = self.client.post("/api/conversations/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["city"], "Delhi")

        created_conv = Conversation.objects.get(id=response.data["data"]["id"])
        self.assertEqual(created_conv.user, self.user_a)

    def test_get_conversation_detail_owner_success(self):
        token = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get(f"/api/conversations/{self.conv_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["id"], str(self.conv_a.id))

    def test_get_conversation_detail_other_user_returns_404(self):
        # User B trying to access User A's conversation MUST return 404 NOT_FOUND
        token = RefreshToken.for_user(self.user_b).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get(f"/api/conversations/{self.conv_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["code"], "NOT_FOUND")

    def test_get_conversation_detail_nonexistent_returns_404(self):
        token = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        fake_uuid = uuid.uuid4()
        response = self.client.get(f"/api/conversations/{fake_uuid}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["code"], "NOT_FOUND")

    def test_get_conversation_messages_owner_success(self):
        token = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get(f"/api/conversations/{self.conv_a.id}/messages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

        results = response.data["data"]["results"]
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["id"], str(self.msg_a1.id))
        self.assertEqual(results[1]["id"], str(self.msg_a2.id))
        self.assertEqual(results[1]["response_data"], {"type": "text", "content": "Assistant reply"})

    def test_get_conversation_messages_other_user_returns_404(self):
        token = RefreshToken.for_user(self.user_b).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get(f"/api/conversations/{self.conv_a.id}/messages/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["code"], "NOT_FOUND")

    def test_delete_conversation_owner_success(self):
        token = RefreshToken.for_user(self.user_a).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.delete(f"/api/conversations/{self.conv_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Confirm conversation and messages are deleted from DB
        self.assertFalse(Conversation.objects.filter(id=self.conv_a.id).exists())
        self.assertEqual(Message.objects.filter(conversation_id=self.conv_a.id).count(), 0)

    def test_delete_conversation_other_user_returns_404(self):
        token = RefreshToken.for_user(self.user_b).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.delete(f"/api/conversations/{self.conv_a.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Conversation.objects.filter(id=self.conv_a.id).exists())

    def test_unauthenticated_requests_rejected(self):
        self.client.credentials()  # Remove authorization header

        endpoints = [
            ("GET", "/api/conversations/"),
            ("POST", "/api/conversations/"),
            ("GET", f"/api/conversations/{self.conv_a.id}/"),
            ("DELETE", f"/api/conversations/{self.conv_a.id}/"),
            ("GET", f"/api/conversations/{self.conv_a.id}/messages/"),
        ]

        for method, url in endpoints:
            if method == "GET":
                resp = self.client.get(url)
            elif method == "POST":
                resp = self.client.post(url, {}, format="json")
            else:
                resp = self.client.delete(url)

            self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertFalse(resp.data["success"])
            self.assertEqual(resp.data["error"]["code"], "UNAUTHORIZED")


