from django.core.exceptions import ValidationError
from django.test import TestCase

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
