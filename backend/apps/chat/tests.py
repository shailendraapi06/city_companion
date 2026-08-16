"""
Phase 7 endpoint tests for POST /api/chat/ (API_Specification.md §5.1-5.5).

Three layers of coverage:
  1. ChatEndpointTests — contract + persistence (only AIService mocked).
  2. ChatEndpointIntegrationTests — the REAL Phase 5D chain end-to-end through
     HTTP (normal recommendation flow, APP_FLOW.md §5).
  3. ChatEndpointResilienceTests — the Phase 7B non-happy-path flows mapped
     directly to APP_FLOW.md: clarification (§4), priority change (§6),
     no-results / closest-alternatives (§10), AI-unavailable fallback
     (§5.6 / §10), emergency (§11), plus malformed-output containment.
     Every test hits the REAL endpoint via the Django test client and the real
     Phase 5D chain — only the LLM is faked (and in the fallback/emergency
     tests even that fake raises).
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
    explanations. Every call's message list is recorded in `self.calls` so
    tests can inspect the REAL tool results the orchestration handed back."""

    def __init__(self, planning_response, explanation_responses):
        self.planning_response = planning_response
        self.explanations = list(explanation_responses)
        self.calls: list[list[dict]] = []

    def create_chat_completion(
        self, messages, tools=None, tool_choice=None, temperature=0.7, response_format=None
    ):
        self.calls.append(messages)
        is_planning = not any(
            isinstance(m, dict) and m.get("role") == "tool" for m in messages
        )
        if is_planning:
            return self.planning_response
        if not self.explanations:
            raise AssertionError("No scripted explanation responses remaining.")
        return self.explanations.pop(0)


class FailingAIClient:
    """LLM client that is entirely down (every call raises). Used to prove the
    §5.6 AI-unavailable fallback and that the emergency fast-path (APP_FLOW §11)
    is fully independent of AI availability."""

    def create_chat_completion(self, *args, **kwargs):
        raise ConnectionError("simulated AI outage")


class RaisingPlacesService:
    """PlaceSearchService stand-in whose search() always raises. Used to prove
    the only legal hard error: 503 AI_UNAVAILABLE when BOTH the AI and the
    deterministic data fallback fail (§5.6)."""

    def search(self, *args, **kwargs):
        raise ConnectionError("simulated data retrieval outage")


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


class ChatEndpointResilienceTests(APITestCase):
    """Phase 7B: every documented non-happy-path flow through the REAL endpoint,
    one test per flow, mapped directly to APP_FLOW.md. Each test hits
    POST /api/chat/ via the Django test client and runs the real Phase 5D chain
    (real AIService orchestration, real PlaceSearchService, real
    RecommendationEngine, real parser + verifier) — only the LLM is faked."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email="resilience@example.com", name="Resilience User", password="Password123!"
        )
        # Priority-change (§6) pair: far-but-top-rated vs next-door-low-rated,
        # engineered so default weights rank far_high first and the location
        # override flips the REAL engine's order (see the test for the math).
        cls.far_high = make_place("College Enclave PG", 4000, 26.486, 80.312, 4.8)
        cls.close_low = make_place("Prime Location PG", 4500, 26.478, 80.30105, 3.0)
        # Fallback / malformed-output tests use a within-budget pair + an
        # out-of-budget candidate that must be filtered out.
        cls.mid = make_place("Comfort Nest PG", 5500, 26.478, 80.30105, 3.6)
        cls.lux = make_place("Luxury Sky PG", 8000, 26.483, 80.308, 4.2)
        # Emergency (§11): two real hospitals near the seeded user location.
        cls.hospital_near = make_place(
            "City General Hospital", 3000, 26.479, 80.302, 4.5, category="hospital"
        )
        cls.hospital_far = make_place(
            "District Hospital", 2500, 26.50, 80.33, 3.5, category="hospital"
        )
        Place.objects.filter(pk=cls.hospital_near.pk).update(phone="+91512000102")
        cls.hospital_near.refresh_from_db()

    def setUp(self):
        self.access = RefreshToken.for_user(self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access}")

    def _patch_ai(self, client, places_service=None):
        from services.ai.service import AIService

        patcher = mock.patch(
            "services.chat.service.AIService",
            return_value=AIService(
                client=client, places_service=places_service, include_external=False
            ),
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        return client

    def test_normal_recommendation_flow(self):
        """APP_FLOW.md §5 — happy path through the endpoint."""
        planning = planning_with_tool(
            "search_places",
            {
                "category": "pg",
                "city": "Kanpur",
                "max_budget": 6000,
                "food_required": True,
                "user_lat": 26.478,
                "user_lon": 80.30105,
            },
        )
        explanation = recommendation_content(
            [(str(self.far_high.id), "College Enclave PG", 92),
             (str(self.mid.id), "Comfort Nest PG", 80)]
        )
        self._patch_ai(ScriptedAIClient(planning, [explanation_with(explanation)]))

        resp = self.client.post(
            "/api/chat/",
            {"message": "Find a PG under ₹6000 with food", "location": {"lat": 26.478, "lng": 80.30105}},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["success"])
        blocks = resp.data["data"]["content"]
        self.assertTrue(blocks)
        rec = next(b for b in blocks if b["type"] == "recommendation")
        self.assertEqual(
            {item["place_id"] for item in rec["items"]},
            {str(self.far_high.id), str(self.mid.id)},
        )
        self.assertNotIn(str(self.lux.id), {item["place_id"] for item in rec["items"]})

    def test_clarification_needed_flow(self):
        """APP_FLOW.md §4 — missing info → the endpoint returns 200 with a
        concise clarifying question as a normal text block, no special error."""
        planning = {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "Could you tell me your budget range and preferred area?",
                    }
                }
            ]
        }
        self._patch_ai(ScriptedAIClient(planning, []))
        resp = self.client.post(
            "/api/chat/", {"message": "Can you help me decide?"}, format="json"
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        blocks = resp.data["data"]["content"]
        self.assertTrue(blocks)
        self.assertEqual(blocks[0]["type"], "text")
        self.assertIn("budget range", blocks[0]["content"])
        self.assertNotIn(
            "recommendation", [b["type"] for b in blocks]
        )  # nothing to recommend yet

    def test_priority_change_flow(self):
        """APP_FLOW.md §6 / §5.8 — 'location matters more than price' flows
        through the SAME endpoint, re-ranks via the real engine's weight
        override, and the AI acknowledges the change."""
        location = {"lat": 26.478, "lng": 80.30105}
        search_args = {
            "category": "pg",
            "city": "Kanpur",
            "max_budget": 5000,
            "user_lat": 26.478,
            "user_lon": 80.30105,
        }
        planning = planning_with_tool("search_places", search_args)
        exp_1 = recommendation_content(
            [(str(self.far_high.id), "College Enclave PG", 90),
             (str(self.close_low.id), "Prime Location PG", 70)]
        )
        exp_2 = recommendation_content(
            [(str(self.close_low.id), "Prime Location PG", 90),
             (str(self.far_high.id), "College Enclave PG", 70)],
            text="Understood — since location matters more than price, I re-ranked by proximity.",
        )
        scripted = self._patch_ai(
            ScriptedAIClient(planning, [explanation_with(exp_1), explanation_with(exp_2)])
        )

        turn_1 = self.client.post(
            "/api/chat/",
            {"message": "Find a PG under ₹5000 near Kakadeo", "location": location},
            format="json",
        )
        self.assertEqual(turn_1.status_code, status.HTTP_200_OK)
        conversation_id = turn_1.data["data"]["conversation_id"]

        turn_2 = self.client.post(
            "/api/chat/",
            {"conversation_id": conversation_id, "message": "location matters more than price",
             "location": location},
            format="json",
        )
        self.assertEqual(turn_2.status_code, status.HTTP_200_OK)
        self.assertEqual(turn_2.data["data"]["conversation_id"], conversation_id)

        # 1) AI acknowledgment surfaces through the endpoint.
        turn_2_text = " ".join(
            b["content"] for b in turn_2.data["data"]["content"] if b["type"] == "text"
        )
        self.assertIn("re-ranked", turn_2_text)

        # 2) The scripted explanation mirrors the flip, AND — critically — the
        #    flip is PROVEN against the real engine: the tool message in the
        #    4th AI call holds the genuine ranked candidates_data from
        #    _execute_search, which used the §10.3 location weight override.
        self.assertEqual(len(scripted.calls), 4)
        tool_msg = next(m for m in scripted.calls[3] if m.get("role") == "tool")
        tool_result = json.loads(tool_msg["content"])
        self.assertEqual(tool_result["places"][0]["place_id"], str(self.close_low.id))
        self.assertEqual(tool_result["places"][1]["place_id"], str(self.far_high.id))
        self.assertEqual(tool_result["places"][0]["rank"], 1)

    def test_no_results_closest_alternatives_flow(self):
        """APP_FLOW.md §10 / §5.7 — zero strong matches still return 200 with a
        helpful closest-alternatives message; never a bare empty result."""
        planning = planning_with_tool(
            "search_places",
            {
                "category": "pg",
                "city": "Kanpur",
                "max_budget": 500,
                "user_lat": 26.478,
                "user_lon": 80.30105,
            },
        )
        explanation = {
            "message": {"role": "assistant"},
            "content": [
                {
                    "type": "text",
                    "content": "I couldn't find any PGs under ₹500. The cheapest verified "
                    "option near you is College Enclave PG at ₹4,000/month. "
                    "Would you like me to widen the budget?",
                }
            ],
        }
        self._patch_ai(ScriptedAIClient(planning, [explanation_with(explanation)]))

        resp = self.client.post(
            "/api/chat/",
            {"message": "PG under ₹500", "location": {"lat": 26.478, "lng": 80.30105}},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        blocks = resp.data["data"]["content"]
        self.assertTrue(blocks)  # never a bare empty result
        joined = " ".join(b.get("content", "") for b in blocks)
        self.assertIn("College Enclave PG", joined)
        self.assertNotIn("recommendation", [b["type"] for b in blocks])

    def test_ai_unavailable_fallback_flow(self):
        """§5.6 — AI down but data/ranking works → 200 with raw ranked results
        plus an 'AI temporarily unavailable' alert; NOT a 503."""
        self._patch_ai(FailingAIClient())

        resp = self.client.post(
            "/api/chat/",
            {"message": "PG under 6000 near Kanpur", "location": {"lat": 26.478, "lng": 80.30105}},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        blocks = resp.data["data"]["content"]
        self.assertTrue(blocks)
        rec = next(b for b in blocks if b["type"] == "recommendation")
        returned_ids = {item["place_id"] for item in rec["items"]}
        self.assertEqual(
            returned_ids, {str(self.far_high.id), str(self.close_low.id), str(self.mid.id)}
        )
        self.assertNotIn(str(self.lux.id), returned_ids)  # ₹8000 > inferred budget
        alerts = " ".join(b.get("content", "") for b in blocks if b["type"] == "alert")
        self.assertIn("temporarily unavailable", alerts)

    def test_both_ai_and_data_unavailable_returns_503(self):
        """§5.6 — ONLY when BOTH the AI and the data fallback fail is the hard
        503 AI_UNAVAILABLE legal."""
        self._patch_ai(FailingAIClient(), places_service=RaisingPlacesService())

        resp = self.client.post(
            "/api/chat/",
            {"message": "PG under 6000 near Kanpur", "location": {"lat": 26.478, "lng": 80.30105}},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertFalse(resp.data["success"])
        self.assertEqual(resp.data["error"]["code"], "AI_UNAVAILABLE")

    def test_emergency_flow(self):
        """APP_FLOW.md §11 / PRD §6.4 — 'Mera accident ho gaya hai, urgent help'
        fast-paths to nearest hospitals + emergency contacts + actions, built
        ONLY from verified data and with AI entirely down (proving the path is
        AI-independent). Held to the SAME Fix 1 grounding standard."""
        from services.ai.verifier import verify_ai_output
        from services.places.providers import place_to_candidate

        self._patch_ai(FailingAIClient())

        resp = self.client.post(
            "/api/chat/",
            {"message": "Mera accident ho gaya hai, urgent help",
             "location": {"lat": 26.478, "lng": 80.30105}},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        blocks = resp.data["data"]["content"]

        # Clear disclaimer to contact local emergency services, incl. 112.
        danger = next(b for b in blocks if b["type"] == "alert" and b.get("level") == "danger")
        self.assertIn("112", danger["content"])

        # Nearest hospitals from verified data, nearest first.
        rec = next(b for b in blocks if b["type"] == "recommendation")
        returned = [item["place_id"] for item in rec["items"]]
        self.assertEqual(
            returned, [str(self.hospital_near.id), str(self.hospital_far.id)]
        )
        self.assertTrue(all(item["name"] in {"City General Hospital", "District Hospital"} for item in rec["items"]))

        # Directions / Call / Share-Location actions, incl. the local hospital.
        actions = [b for b in blocks if b["type"] == "action"]
        action_types = {a["action_type"] for a in actions}
        self.assertLessEqual({"directions", "call", "share_location"}, action_types)
        self.assertIn("+91512000102", {a["payload"].get("phone") for a in actions})

        # Same mechanical grounding check as every normal response (Fix 1) —
        # deliberately not relaxed for emergencies.
        pool = {
            c.place_id: c
            for c in [place_to_candidate(self.hospital_near), place_to_candidate(self.hospital_far)]
        }
        result = verify_ai_output({"content": blocks}, pool)
        self.assertTrue(result.ok, result.errors)

    def test_malformed_ai_output_never_reaches_frontend(self):
        """Task 6 — schema-validation failures (two in a row, both exhausted)
        fall back to a clean, grounded, schema-valid response; neither the HTTP
        response nor the persisted response_data ever leaks malformed content."""
        from services.ai.schemas import ALLOWED_BLOCK_TYPES

        planning = planning_with_tool(
            "search_places",
            {
                "category": "pg",
                "city": "Kanpur",
                "max_budget": 6000,
                "user_lat": 26.478,
                "user_lon": 80.30105,
            },
        )
        bogus_1 = explanation_with("this is not even an object")
        bogus_2 = explanation_with(
            {"message": {"role": "assistant"}, "content": [{"type": "bogus_block", "content": "x"}]}
        )
        self._patch_ai(ScriptedAIClient(planning, [bogus_1, bogus_2]))

        resp = self.client.post(
            "/api/chat/",
            {"message": "PG under 6000 near Kanpur", "location": {"lat": 26.478, "lng": 80.30105}},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        blocks = resp.data["data"]["content"]
        self.assertTrue(blocks)
        self.assertLessEqual({b["type"] for b in blocks}, ALLOWED_BLOCK_TYPES)
        rec = next(b for b in blocks if b["type"] == "recommendation")
        self.assertEqual(
            {item["place_id"] for item in rec["items"]},
            {str(self.far_high.id), str(self.close_low.id), str(self.mid.id)},
        )

        # Persisted response_data is equally clean.
        conversation = Conversation.objects.get(id=resp.data["data"]["conversation_id"])
        stored = next(m for m in conversation.messages.all() if m.role == "assistant").response_data
        self.assertLessEqual({b["type"] for b in stored["content"]}, ALLOWED_BLOCK_TYPES)
