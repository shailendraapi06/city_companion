"""
Fix 1/2/3 wiring tests and Phase 5D E2E-style tests for the AI orchestration.

The ONLY thing mocked here is the LLM itself (ScriptedAIClient) — every other
part runs the real code path: real Place model rows, real PlaceSearchService,
real RecommendationEngine, real parser.py validation and real verifier.py
grounding checks. The user message "PG near college, ₹6000/month, food
included" is the exact example from TRD.md §13 and AI_Build_Prompts_Phase5.md
Prompt 5D.
"""

import json
from decimal import Decimal

from django.test import TestCase

from apps.places.models import Place
from services.ai.service import AIService
from services.ai.verifier import verify_ai_output

ORIGIN_LAT = Decimal("26.478000")
ORIGIN_LON = Decimal("80.301000")


def make_place(name, price, lat, lon, rating, category="pg"):
    """Create a real Place row (the data the pipeline must be grounded in)."""
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


def planning_with_tool(name, args, content=None):
    return {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": content,
                    "tool_calls": [
                        {
                            "id": "call_1",
                            "type": "function",
                            "function": {
                                "name": name,
                                "arguments": json.dumps(args),
                            },
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
    """Fake LLM: first call returns the planning (tool-call) response; later
    calls return scripted explanation responses in order."""

    def __init__(self, planning_response, explanation_responses):
        self.planning_response = planning_response
        self.explanations = list(explanation_responses)
        self.calls = []

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


def _first_tool_result(client):
    for messages in client.calls:
        for m in messages:
            if isinstance(m, dict) and m.get("role") == "tool":
                return json.loads(m["content"])
    return None


class RecordingPlaceSearchService:
    def __init__(self):
        self.calls = []
        self.candidates = []

    def search(self, **kwargs):
        self.calls.append(kwargs)
        return list(self.candidates)


class RecordingRecommendationEngine:
    def __init__(self):
        self.calls = []

    def recommend(self, **kwargs):
        self.calls.append(kwargs)
        return []


class ToolWiringTests(TestCase):
    """Fix 2: get_place_details and compare_places must execute real lookups."""

    def test_get_place_details_executes_real_lookup(self):
        place = make_place("Budget Star PG", 4000, 26.486, 80.312, 4.8)
        svc = AIService(include_external=False)
        pool, result = svc._execute_get_place_details({"place_id": str(place.id)})

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["places"][0]["name"], "Budget Star PG")
        self.assertEqual(result["places"][0]["price_range"]["amount"], 4000)
        self.assertIn(str(place.id), pool)
        self.assertEqual(pool[str(place.id)].price_range["amount"], 4000)

    def test_get_place_details_not_found(self):
        svc = AIService(include_external=False)
        _, result = svc._execute_get_place_details(
            {"place_id": "00000000-0000-4000-8000-000000000000"}
        )
        self.assertEqual(result["status"], "not_found")

    def test_get_place_details_missing_param(self):
        svc = AIService(include_external=False)
        _, result = svc._execute_get_place_details({})
        self.assertEqual(result["status"], "error")

    def test_compare_places_returns_real_data(self):
        p1 = make_place("Budget Star PG", 4000, 26.486, 80.312, 4.8)
        p2 = make_place("Prime Location PG", 4500, 26.478, 80.30105, 3.0)
        svc = AIService(include_external=False)
        pool, result = svc._execute_compare_places(
            {"place_ids": [str(p1.id), str(p2.id)]}
        )

        self.assertEqual(result["status"], "success")
        self.assertEqual(result["count"], 2)
        self.assertEqual({r["name"] for r in result["places"]}, {p1.name, p2.name})
        self.assertEqual(set(pool.keys()), {str(p1.id), str(p2.id)})

    def test_compare_places_missing_param(self):
        svc = AIService(include_external=False)
        _, result = svc._execute_compare_places({})
        self.assertEqual(result["status"], "error")

    def test_compare_places_reports_missing_ids(self):
        p1 = make_place("Budget Star PG", 4000, 26.486, 80.312, 4.8)
        svc = AIService(include_external=False)
        _, result = svc._execute_compare_places(
            {"place_ids": [str(p1.id), "00000000-0000-4000-8000-000000000000"]}
        )
        self.assertEqual(result["count"], 1)
        self.assertEqual(len(result["missing"]), 1)

    def test_include_external_flag_reaches_search(self):
        """The real pipeline must never call the external (Nominatim) provider
        when include_external=False is set — tests stay offline."""
        places_service = RecordingPlaceSearchService()
        rec_engine = RecordingRecommendationEngine()
        client = ScriptedAIClient(
            planning_with_tool("search_places", {"category": "pg", "city": "Kanpur"}),
            [explanation_with({"message": {"role": "assistant"}, "content": [{"type": "text", "content": "None found."}]})],
        )
        svc = AIService(
            client=client,
            places_service=places_service,
            rec_engine=rec_engine,
            include_external=False,
        )
        svc.process_user_message("PG near college, ₹6000/month, food included")

        self.assertEqual(len(places_service.calls), 1)
        self.assertIs(places_service.calls[0]["include_external"], False)
        self.assertIsNone(rec_engine.calls[0]["weights"])


class RetryAndFallbackTests(TestCase):
    """Fix 3: exactly one re-prompt with specific feedback, then safe fallback."""

    def setUp(self):
        self.cheap = make_place("Budget Star PG", 4000, 26.486, 80.312, 4.8)

    def _service(self, explanations):
        client = ScriptedAIClient(
            planning_with_tool("search_places", {"category": "pg", "city": "Kanpur"}),
            explanations,
        )
        svc = AIService(client=client, include_external=False)
        return svc, client

    def test_schema_failure_then_retry_succeeds(self):
        bad = {"message": {"role": "assistant"}, "content": [{"type": "bogus_block", "data": 1}]}
        good = {"message": {"role": "assistant"}, "content": [{"type": "text", "content": "Here you go."}]}
        svc, client = self._service([explanation_with(bad), explanation_with(good)])

        result = svc.process_user_message("PG near college, ₹6000/month, food included")

        self.assertEqual(result["content"][0]["type"], "text")
        self.assertEqual(result["content"][0]["content"], "Here you go.")
        feedback_seen = any(
            isinstance(m, dict) and m.get("role") == "system"
            and "rejected by the response schema validator" in (m.get("content") or "")
            for messages in client.calls for m in messages
        )
        self.assertTrue(feedback_seen, "retry call must carry specific schema feedback")

    def test_ungrounded_place_then_retry_succeeds(self):
        bad = recommendation_content([("00000000-0000-4000-8000-000000000000", "Fabricated PG", 95)])
        good = recommendation_content([(str(self.cheap.id), "Budget Star PG", 92)])
        svc, client = self._service([explanation_with(bad), explanation_with(good)])

        result = svc.process_user_message("PG near college, ₹6000/month, food included")

        items = result["content"][1]["items"]
        self.assertEqual([i["place_id"] for i in items], [str(self.cheap.id)])
        feedback_seen = any(
            isinstance(m, dict) and m.get("role") == "system"
            and "ungrounded" in (m.get("content") or "")
            for messages in client.calls for m in messages
        )
        self.assertTrue(feedback_seen, "retry call must carry hallucination feedback")

    def test_all_attempts_fail_falls_back_to_real_data(self):
        bad1 = {"message": {"role": "assistant"}, "content": [{"type": "bogus_block", "data": 1}]}
        bad2 = {"message": {"role": "assistant"}, "content": [{"type": "bogus_block", "data": 2}]}
        svc, client = self._service([explanation_with(bad1), explanation_with(bad2)])

        result = svc.process_user_message("PG near college, ₹6000/month, food included")

        # Fallback is built from real candidates, not fabricated prose.
        types = [b["type"] for b in result["content"]]
        self.assertIn("recommendation", types)
        rec_block = next(b for b in result["content"] if b["type"] == "recommendation")
        for item in rec_block["items"]:
            self.assertEqual(item["place_id"], str(self.cheap.id))
            self.assertEqual(item["name"], "Budget Star PG")

    def test_fallback_grounded_recommendation_passes_verifier(self):
        bad1 = {"message": {"role": "assistant"}, "content": [{"type": "bogus_block", "data": 1}]}
        bad2 = {"message": {"role": "assistant"}, "content": [{"type": "bogus_block", "data": 2}]}
        svc, _ = self._service([explanation_with(bad1), explanation_with(bad2)])

        result = svc.process_user_message("PG near college, ₹6000/month, food included")

        candidates = {str(self.cheap.id): self.cheap_as_candidate()}
        verification = verify_ai_output(result, candidates)
        self.assertTrue(verification.ok, verification.errors)

    def cheap_as_candidate(self):
        from services.places.providers import place_to_candidate

        return place_to_candidate(self.cheap)


class E2EHappyPathSearchTest(TestCase):
    """Prompt 5D E2E #1: 'PG near college, ₹6000/month, food included'."""

    @classmethod
    def setUpTestData(cls):
        cls.cheap = make_place("Budget Star PG", 4000, 26.486, 80.312, 4.8)
        cls.mid = make_place("Prime Location PG", 4500, 26.478, 80.30105, 3.0)
        cls.lux = make_place("Luxury Sky PG", 8000, 26.483, 80.308, 4.2)

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
        client = ScriptedAIClient(planning, [explanation_with(explanation)])
        svc = AIService(client=client, include_external=False)

        result = svc.process_user_message("PG near college, ₹6000/month, food included")

        # 1. The AI explanation passed schema validation + verifier.
        rec_block = next(b for b in result["content"] if b["type"] == "recommendation")
        returned_ids = {item["place_id"] for item in rec_block["items"]}
        self.assertEqual(returned_ids, {str(self.cheap.id), str(self.mid.id)})

        # 2. The ₹8000 place was filtered out by the real budget filter.
        self.assertNotIn(str(self.lux.id), returned_ids)

        # 3. The real engine ranked Budget Star (₹4000, 4.8) ahead. No user
        # coords in this call, so distance factor = half weight (10.0):
        # 30 (budget) + 25 (food req) + 10 (distance) + 14.4 (rating) = 79.4.
        tool_result = _first_tool_result(client)
        self.assertEqual(tool_result["places"][0]["place_id"], str(self.cheap.id))
        self.assertEqual(tool_result["places"][0]["match_score"], 79.4)


class E2EImpossibleBudgetTest(TestCase):
    """Prompt 5D E2E #2: impossibly low budget must fall back gracefully, never
    hallucinate."""

    @classmethod
    def setUpTestData(cls):
        cls.cheap = make_place("Budget Star PG", 4000, 26.486, 80.312, 4.8)
        cls.mid = make_place("Prime Location PG", 4500, 26.478, 80.30105, 3.0)

    def test_no_match_falls_back_with_guidance(self):
        planning = planning_with_tool(
            "search_places", {"category": "pg", "city": "Kanpur", "max_budget": 500}
        )
        # The AI keeps emitting invalid payloads; the pipeline must refuse them
        # and fall back to a real-data no-match message.
        bad1 = {"message": {"role": "assistant"}, "content": [{"type": "bogus_block", "data": 1}]}
        bad2 = {"message": {"role": "assistant"}, "content": [{"type": "bogus_block", "data": 2}]}
        client = ScriptedAIClient(planning, [explanation_with(bad1), explanation_with(bad2)])
        svc = AIService(client=client, include_external=False)

        result = svc.process_user_message("PG under ₹500 per month")

        self.assertEqual(result["content"][0]["type"], "alert")
        self.assertIn("couldn't find exact matches", result["content"][0]["content"])
        self.assertIn("adjusting your search filters", result["content"][0]["content"])
        # No recommendation block is fabricated for an empty result set.
        self.assertNotIn("recommendation", [b["type"] for b in result["content"]])


class E2EPriorityOverrideTest(TestCase):
    """Prompt 5D E2E #3: location priority must flip the deterministic ranking
    and the priority note must reach the AI."""

    @classmethod
    def setUpTestData(cls):
        cls.far_high_rating = make_place("Budget Star PG", 4000, 26.486, 80.312, 4.8)
        cls.close_low_rating = make_place("Prime Location PG", 4500, 26.478, 80.30105, 3.0)

    def _run(self, message, ordered_pairs):
        planning = planning_with_tool(
            "search_places",
            {
                "category": "pg",
                "city": "Kanpur",
                "user_lat": float(ORIGIN_LAT),
                "user_lon": float(ORIGIN_LON),
            },
        )
        client = ScriptedAIClient(planning, [explanation_with(recommendation_content(ordered_pairs))])
        svc = AIService(client=client, include_external=False)
        result = svc.process_user_message(message)
        return client, result

    def test_default_ranking_and_distance_priority_flip(self):
        # Default weights (30/25/20/15/10): far-but-high-rating place wins.
        default_client, default_result = self._run(
            "Show me PGs in Kanpur",
            [
                (str(self.far_high_rating.id), "Budget Star PG", 90),
                (str(self.close_low_rating.id), "Prime Location PG", 70),
            ],
        )
        default_order = [
            item["place_id"] for item in default_result["content"][1]["items"]
        ]
        self.assertEqual(default_order, [str(self.far_high_rating.id), str(self.close_low_rating.id)])

        # Location priority (50/10/20/10/10): the close place must rank first.
        priority_client, priority_result = self._run(
            "Location matters more than price, show nearby options",
            [
                (str(self.close_low_rating.id), "Prime Location PG", 95),
                (str(self.far_high_rating.id), "Budget Star PG", 85),
            ],
        )
        priority_order = [
            item["place_id"] for item in priority_result["content"][1]["items"]
        ]
        self.assertEqual(priority_order, [str(self.close_low_rating.id), str(self.far_high_rating.id)])

        # The REAL deterministic engine (not the AI) produced the flip: the
        # tool result handed to the model lists the close place first under
        # priority weights and the far place first under default weights.
        priority_tool_result = _first_tool_result(priority_client)
        self.assertEqual(priority_tool_result["places"][0]["place_id"], str(self.close_low_rating.id))
        default_tool_result = _first_tool_result(default_client)
        self.assertEqual(default_tool_result["places"][0]["place_id"], str(self.far_high_rating.id))

        # Priority note must have reached the AI explanation call.
        note_seen = any(
            isinstance(m, dict) and m.get("role") == "system"
            and "LOCATION/distance matters more" in (m.get("content") or "")
            for messages in priority_client.calls for m in messages
        )
        self.assertTrue(note_seen, "priority note must be injected into the AI context")
