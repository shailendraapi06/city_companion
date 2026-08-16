"""
Phase 7A happy-path tests for POST /api/chat/ (API_Specification.md §5.1-5.2,
§5.5). Fallback / error-resilience / emergency scenarios are explicitly Phase
7B — not covered here.

Two layers of coverage:
  1. ChatEndpointTests — real ChatService + persisted Conversation/Message
     rows, with ONLY the AIService mocked. Verifies the request/response
     contract, implicit conversation creation (§3.2 [TBD] resolution),
     conversation reuse, ownership isolation (404-not-403), §5.5 history
     window assembly, and location/profile plumbing.
  2. ChatEndpointIntegrationTests — the REAL Phase 5D chain end-to-end through
     HTTP: real AIService orchestration, real PlaceSearchService, real
     RecommendationEngine, real parser + verifier. Only the LLM is faked
     (ScriptedAIClient, exactly as the Phase 5D tests do). Proves the endpoint
     exercises the actual verified AI/recommendation chain — no parallel logic.
"""

import json
from decimal import Decimal
from unittest import mock

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.conversations.models import Conversation, Message
from apps.places.models import Place
from apps.users.models import User, UserProfile


def make_place(name, price, lat, lon, rating, category="pg"):
    return Place.objects.create(
        name=name,
        category=category,
        description=f"Test description for {name}.",
        address=f"{name}, Kakadeo, Kanpur, Uttar Pradesh 208025",
        latitude=Decimal(str(lat)),
        longitude=Decimal(str(lon)),
        rating=Decimal(str(rating)),
        price_range={"amount": price, "unit": "month"},
        amenities=["wifi", "food"],
        verified=False,
    )


def assistant_payload():
    return {
        "message": {"role": "assistant"},
        "content": [
            {"type": "text", "content": "Sure — I found several options that match your budget."},
            {"type": "alert", "level": "warning", "content": "Prices may have changed. Confirm before booking."},
        ],
    }


def planning_with_tool(name, args):
    return {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        {
                            "id": "call_1",
                            "type": "function",
                            "function": {"name": name, "arguments": json.dumps(args)},
                        }
                    ],
                }
            }
        ]
    }


def explanation_with(payload):
    return {"choices": [{"message": {"role": "assistant", "content": json.dumps(payload)}}]}


def recommendation_content(ordered_pairs, text="Options:"):
    return {
        "message": {"role": "assistant"},
        "content": [
            {"type": "text", "content": text},
            {
                "type": "recommendation",
                "items": [
                    {
                        "place_id": place_id,
                        "name": name,
                        "category": "pg",
                        "match_score": score,
                        "rank": rank,
                    }
                    for rank, (place_id, name, score) in enumerate(ordered_pairs, start=1)
                ],
            },
        ],
    }


class ScriptedAIClient:
    """Fake LLM, same contract as the Phase 5D tests_orchestration client:
    the first call is the planning (tool-call) turn; later calls are scripted
    explanations."""

    def __init__(self, planning_response, explanation_responses):
        self.planning_response = planning_response
        self.explanations = list(explanation_responses)

    def create_chat_completion(
        self, messages, tools=None, tool_choice=None, temperature=0.7, response_format=None
    ):
        is_planning = not any(
            isinstance(m, dict) and m.get("role") == "tool" for m in messages
        )
        if is_planning:
            return self.planning_response
        if not self.explanations:
            raise AssertionError("No scripted explanation responses remaining.")
        return self.explanations.pop(0)


class ChatEndpointTests(APITestCase):
    """Contract + persistence tests. Only AIService is mocked."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="chatuser@example.com", name="Chat User", password="Password123!"
        )
        self.other = User.objects.create_user(
            email="other@example.com", name="Other User", password="Password123!"
        )
        self.access = RefreshToken.for_user(self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access}")

    def _mock_ai(self, payload=None):
        ai_mock = mock.Mock()
        ai_mock.process_user_message.return_value = payload or assistant_payload()
        patcher = mock.patch("services.chat.service.AIService", return_value=ai_mock)
        patcher.start()
        self.addCleanup(patcher.stop)
        return ai_mock

    def test_implicit_conversation_creation_and_persistence(self):
        ai_mock = self._mock_ai()
        self.assertEqual(Conversation.objects.count(), 0)

        resp = self.client.post(
            "/api/chat/",
            {"conversation_id": None, "message": "Find a PG near Kanpur for under 6000"},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["success"])
        self.assertIsNone(resp.data["error"])

        # §5.1 response envelope: conversation_id, message{id, role}, content.
        self.assertEqual(resp.data["data"]["message"]["role"], "assistant")
        self.assertIsNotNone(resp.data["data"]["message"]["id"])
        self.assertEqual(resp.data["data"]["content"], assistant_payload()["content"])

        # §3.2 [TBD] resolution: a conversation was implicitly created and
        # its id returned; the user + assistant messages are linked to it.
        conversation_id = resp.data["data"]["conversation_id"]
        conversation = Conversation.objects.get(id=conversation_id)
        self.assertEqual(conversation.user, self.user)
        self.assertEqual(Conversation.objects.count(), 1)

        messages = list(conversation.messages.all())
        self.assertEqual([m.role for m in messages], ["user", "assistant"])
        self.assertEqual(messages[0].content, "Find a PG near Kanpur for under 6000")
        self.assertEqual(messages[1].response_data, assistant_payload())
        self.assertEqual(
            messages[1].content,
            "Sure — I found several options that match your budget.\n"
            "Prices may have changed. Confirm before booking.",
        )
        self.assertEqual(resp.data["data"]["message"]["id"], str(messages[1].id))

        # The SAME AIService entry point the Phase 5D tests exercise was called.
        ai_mock.process_user_message.assert_called_once()
        call_kwargs = ai_mock.process_user_message.call_args.kwargs
        self.assertEqual(call_kwargs["user_message"], "Find a PG near Kanpur for under 6000")
        self.assertEqual(call_kwargs["history"], [])
        self.assertIsNone(call_kwargs["location"])

    def test_reuses_existing_conversation(self):
        self._mock_ai()
        conversation = Conversation.objects.create(user=self.user, title="Existing", city="Kanpur")
        Message.objects.create(conversation=conversation, role="user", content="Prior turn")
        Message.objects.create(
            conversation=conversation, role="assistant", content="Prior reply",
            response_data={"message": {"role": "assistant"}, "content": []},
        )

        resp = self.client.post(
            "/api/chat/",
            {"conversation_id": str(conversation.id), "message": "Show me cafes too"},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["data"]["conversation_id"], str(conversation.id))
        self.assertEqual(Conversation.objects.count(), 1)  # no new row
        self.assertEqual(Message.objects.filter(conversation=conversation).count(), 4)

    def test_other_users_conversation_returns_404(self):
        self._mock_ai()
        conversation = Conversation.objects.create(user=self.other, title="Theirs")
        # Credentials stay on self.user (via setUp), who does NOT own this
        # conversation → must 404 (404-not-403 isolation, API_Specification §1.2).

        resp = self.client.post(
            "/api/chat/",
            {"conversation_id": str(conversation.id), "message": "anything"},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(resp.data["success"])
        self.assertEqual(resp.data["error"]["code"], "NOT_FOUND")
        # No messages may be written on a foreign conversation.
        self.assertEqual(Message.objects.filter(conversation=conversation).count(), 0)

    def test_history_window_assembled_at_this_layer(self):
        """§5.5: the endpoint passes the recent-messages window to the AI; the
        frontend never resends history. Only the last 6 PRIOR turns, excluding
        the current message, are forwarded in chronological order."""
        from datetime import timedelta

        from django.utils import timezone

        ai_mock = self._mock_ai()
        conversation = Conversation.objects.create(user=self.user)
        prior_contents = [f"turn-{i}" for i in range(8)]
        base = timezone.now()
        for i, content in enumerate(prior_contents):
            role = "user" if i % 2 == 0 else "assistant"
            message = Message.objects.create(
                conversation=conversation, role=role, content=content
            )
            # auto_now_add ignores explicit created_at on create(); set it via
            # update() so recency ordering is deterministic in the test.
            Message.objects.filter(id=message.id).update(
                created_at=base - timedelta(minutes=8 - i)
            )

        resp = self.client.post(
            "/api/chat/",
            {"conversation_id": str(conversation.id), "message": "the-new-message"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        history = ai_mock.process_user_message.call_args.kwargs["history"]
        self.assertEqual(
            [h["content"] for h in history], prior_contents[-6:]  # 8 prior → last 6
        )
        self.assertNotIn("the-new-message", [h["content"] for h in history])
        self.assertTrue(all({"role", "content"} <= set(h.keys()) for h in history))

    def test_user_profile_and_location_passed_to_ai(self):
        ai_mock = self._mock_ai()
        UserProfile.objects.create(user=self.user, preferred_city="Delhi", language="hi")

        resp = self.client.post(
            "/api/chat/",
            {
                "message": "Restaurants near me",
                "location": {"lat": 26.4499, "lng": 80.3319},
            },
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        call_kwargs = ai_mock.process_user_message.call_args.kwargs
        self.assertEqual(
            call_kwargs["user_profile"], {"preferred_city": "Delhi", "language": "hi"}
        )
        self.assertEqual(call_kwargs["location"], {"lat": 26.4499, "lng": 80.3319})

    def test_empty_message_returns_400(self):
        self._mock_ai()
        for payload in ({"message": ""}, {"message": "   "}, {}):
            resp = self.client.post("/api/chat/", payload, format="json")
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertFalse(resp.data["success"])
            self.assertEqual(resp.data["error"]["code"], "VALIDATION_ERROR")

    def test_malformed_location_returns_400(self):
        self._mock_ai()
        for location in ({"lat": "not-a-number", "lng": 80.3}, "Kanpur", {"lat": 1.0}):
            resp = self.client.post(
                "/api/chat/",
                {"message": "food", "location": location},
                format="json",
            )
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(resp.data["error"]["code"], "VALIDATION_ERROR")

    def test_unauthenticated_returns_401(self):
        self.client.credentials()
        resp = self.client.post(
            "/api/chat/", {"message": "anything"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(resp.data["success"])
        self.assertEqual(resp.data["error"]["code"], "UNAUTHORIZED")


class ChatEndpointIntegrationTests(APITestCase):
    """Real Phase 5D chain through HTTP: real AIService orchestration, real
    PlaceSearchService, real RecommendationEngine, real parser + verifier.
    Only the LLM is scripted, exactly like the Phase 5D E2E tests."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email="integra@example.com", name="Integration User", password="Password123!"
        )
        cls.cheap = make_place("Budget Star PG", 4000, 26.486, 80.312, 4.8)
        cls.mid = make_place("Prime Location PG", 4500, 26.478, 80.30105, 3.0)
        cls.lux = make_place("Luxury Sky PG", 8000, 26.483, 80.308, 4.2)

    def setUp(self):
        self.access = RefreshToken.for_user(self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access}")

    def test_real_pipeline_returns_grounded_recommendations(self):
        planning = planning_with_tool(
            "search_places",
            {"category": "pg", "city": "Kanpur", "max_budget": 6000, "food_required": True},
        )
        explanation = recommendation_content(
            [
                (str(self.cheap.id), "Budget Star PG", 92),
                (str(self.mid.id), "Prime Location PG", 78),
            ]
        )
        scripted = ScriptedAIClient(planning, [explanation_with(explanation)])

        from services.ai.service import AIService

        with mock.patch(
            "services.chat.service.AIService",
            return_value=AIService(client=scripted, include_external=False),
        ):
            resp = self.client.post(
                "/api/chat/",
                {"message": "PG near college, ₹6000/month, food included"},
                format="json",
            )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["success"])

        # Contract envelope.
        data = resp.data["data"]
        self.assertIn("conversation_id", data)
        self.assertEqual(data["message"]["role"], "assistant")
        self.assertIsNotNone(data["message"]["id"])

        # The real engine returned only in-budget, food-enabled candidates.
        rec_block = next(b for b in data["content"] if b["type"] == "recommendation")
        returned_ids = {item["place_id"] for item in rec_block["items"]}
        self.assertEqual(returned_ids, {str(self.cheap.id), str(self.mid.id)})
        self.assertNotIn(str(self.lux.id), returned_ids)  # ₹8000 filtered out

        # Both message rows persisted; response_data == validated AI payload.
        conversation = Conversation.objects.get(id=data["conversation_id"])
        messages = list(conversation.messages.all())
        self.assertEqual([m.role for m in messages], ["user", "assistant"])
        self.assertEqual(str(messages[1].id), data["message"]["id"])
        stored_rec = next(
            b for b in messages[1].response_data["content"] if b["type"] == "recommendation"
        )
        self.assertEqual(
            {item["place_id"] for item in stored_rec["items"]}, returned_ids
        )
