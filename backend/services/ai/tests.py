from django.test import TestCase
from services.ai.client import OpenAIClientError, OpenAIClientWrapper
from services.ai.parser import AIValidationError, validate_and_normalize_ai_response
from services.ai.prompts import SYSTEM_PROMPT
from services.ai.schemas import ALLOWED_BLOCK_TYPES, BLOCK_REQUIRED_FIELDS
from services.ai.tools import TOOLS_DEFINITIONS


class AIServiceFoundationsTests(TestCase):
    def test_client_wrapper_mock_mode(self):
        client = OpenAIClientWrapper(api_key="mock")
        res = client.create_chat_completion(
            messages=[{"role": "user", "content": "Find PGs in Kanpur"}]
        )
        self.assertIn("choices", res)
        self.assertEqual(len(res["choices"]), 1)
        self.assertEqual(res["choices"][0]["message"]["role"], "assistant")

    def test_system_prompt_content(self):
        self.assertIn("City Companion", SYSTEM_PROMPT)
        self.assertIn("ZERO HALLUCINATION", SYSTEM_PROMPT)
        self.assertIn("search_places", SYSTEM_PROMPT)

    def test_tools_definitions_format(self):
        self.assertEqual(len(TOOLS_DEFINITIONS), 4)
        tool_names = {t["function"]["name"] for t in TOOLS_DEFINITIONS}
        self.assertEqual(
            tool_names,
            {"search_places", "get_place_details", "search_nearby", "compare_places"},
        )
        for t in TOOLS_DEFINITIONS:
            self.assertEqual(t["type"], "function")
            self.assertIn("description", t["function"])
            self.assertIn("parameters", t["function"])

    def test_parser_valid_payload_passes(self):
        valid_payload = {
            "message": {"role": "assistant"},
            "content": [
                {"type": "text", "content": "Here are your recommendations:"},
                {"type": "heading", "content": "Top PGs in Kanpur", "level": 2},
                {
                    "type": "recommendation",
                    "items": [
                        {
                            "place_id": "123e4567-e89b-12d3-a456-426614174000",
                            "name": "Sharma Girls PG",
                            "category": "pg",
                            "match_score": 92,
                            "rank": 1,
                        }
                    ],
                },
                {"type": "alert", "level": "info", "content": "Food included in mess"},
            ],
        }

        normalized = validate_and_normalize_ai_response(valid_payload)
        self.assertEqual(normalized["message"]["role"], "assistant")
        self.assertEqual(len(normalized["content"]), 4)

    def test_parser_rejects_missing_message(self):
        invalid_payload = {"content": [{"type": "text", "content": "Hello"}]}
        with self.assertRaises(AIValidationError):
            validate_and_normalize_ai_response(invalid_payload)

    def test_parser_rejects_missing_content(self):
        invalid_payload = {"message": {"role": "assistant"}}
        with self.assertRaises(AIValidationError):
            validate_and_normalize_ai_response(invalid_payload)

    def test_parser_rejects_unsupported_block_type(self):
        invalid_payload = {
            "message": {"role": "assistant"},
            "content": [{"type": "unsupported_type_xyz", "data": "123"}],
        }
        with self.assertRaises(AIValidationError):
            validate_and_normalize_ai_response(invalid_payload)

    def test_parser_rejects_missing_required_block_field(self):
        # Heading block missing 'content'
        invalid_payload = {
            "message": {"role": "assistant"},
            "content": [{"type": "heading", "level": 2}],
        }
        with self.assertRaises(AIValidationError):
            validate_and_normalize_ai_response(invalid_payload)

    def test_parser_rejects_invalid_recommendation_items(self):
        # Recommendation block with 'items' as string instead of list
        invalid_payload = {
            "message": {"role": "assistant"},
            "content": [{"type": "recommendation", "items": "invalid_string_not_list"}],
        }
        with self.assertRaises(AIValidationError):
            validate_and_normalize_ai_response(invalid_payload)
