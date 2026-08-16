"""
Unit tests for the mechanical hallucination-control verifier (Fix 1).

These test verifier.py in isolation against real candidate objects — no DB,
no AI, no orchestration. The orchestration wiring (verifier invoked on every
AI output, retry then fallback) is covered in tests_orchestration.py.
"""

from django.test import SimpleTestCase

from services.ai.verifier import (
    extract_place_references,
    verify_ai_output,
)
from services.places.providers import PlaceCandidate

PLACE_A_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
PLACE_B_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
FAKE_ID = "00000000-0000-4000-8000-000000000000"


def make_candidate(
    place_id=PLACE_A_ID,
    name="Budget Star PG",
    category="pg",
    rating=4.8,
    amount=4000,
    amenities=None,
):
    return PlaceCandidate(
        place_id=place_id,
        name=name,
        category=category,
        latitude=26.478,
        longitude=80.301,
        rating=rating,
        price_range={"amount": amount, "unit": "month"},
        amenities=amenities or ["wifi", "food"],
    )


def payload_with(content):
    return {"message": {"role": "assistant"}, "content": content}


class VerifyAiOutputTests(SimpleTestCase):
    def setUp(self):
        self.cand_a = make_candidate()
        self.cand_b = make_candidate(
            place_id=PLACE_B_ID,
            name="Prime Location PG",
            rating=3.0,
            amount=4500,
            amenities=["wifi"],
        )
        self.by_id = {c.place_id: c for c in [self.cand_a, self.cand_b]}

    def _verify(self, content):
        return verify_ai_output(payload_with(content), self.by_id)

    def test_fully_grounded_recommendation_passes(self):
        content = [
            {"type": "text", "content": "Two options:"},
            {
                "type": "recommendation",
                "items": [
                    {
                        "place_id": PLACE_A_ID,
                        "name": "Budget Star PG",
                        "category": "pg",
                        "match_score": 92,
                        "rank": 1,
                    },
                    {
                        "place_id": PLACE_B_ID,
                        "name": "Prime Location PG",
                        "category": "pg",
                        "match_score": 70,
                        "rank": 2,
                    },
                ],
            },
        ]
        result = self._verify(content)
        self.assertTrue(result.ok)
        self.assertEqual(result.errors, [])
        self.assertEqual(len(result.references), 2)

    def test_item_without_place_id_fails(self):
        content = [
            {
                "type": "recommendation",
                "items": [
                    {"name": "Budget Star PG", "category": "pg"},
                ],
            }
        ]
        result = self._verify(content)
        self.assertFalse(result.ok)
        self.assertTrue(any("without a 'place_id'" in e for e in result.errors))

    def test_fabricated_place_id_fails(self):
        content = [
            {
                "type": "recommendation",
                "items": [{"place_id": FAKE_ID, "name": "Fake PG", "category": "pg"}],
            }
        ]
        result = self._verify(content)
        self.assertFalse(result.ok)
        self.assertTrue(any(FAKE_ID in e for e in result.errors))

    def test_name_mismatch_fails(self):
        content = [
            {
                "type": "recommendation",
                "items": [
                    {"place_id": PLACE_A_ID, "name": "Some Other Name", "category": "pg"}
                ],
            }
        ]
        result = self._verify(content)
        self.assertFalse(result.ok)
        self.assertTrue(any("name" in e for e in result.errors))

    def test_category_mismatch_fails(self):
        content = [
            {
                "type": "recommendation",
                "items": [
                    {"place_id": PLACE_A_ID, "name": "Budget Star PG", "category": "hotel"}
                ],
            }
        ]
        result = self._verify(content)
        self.assertFalse(result.ok)
        self.assertTrue(any("category" in e for e in result.errors))

    def test_price_mismatch_fails(self):
        content = [
            {
                "type": "recommendation",
                "items": [
                    {
                        "place_id": PLACE_A_ID,
                        "name": "Budget Star PG",
                        "category": "pg",
                        "price_range": {"amount": 3000, "unit": "month"},
                    }
                ],
            }
        ]
        result = self._verify(content)
        self.assertFalse(result.ok)
        self.assertTrue(any("price" in e for e in result.errors))

    def test_rating_mismatch_fails(self):
        content = [
            {
                "type": "recommendation",
                "items": [
                    {"place_id": PLACE_A_ID, "name": "Budget Star PG", "category": "pg", "rating": 5.0}
                ],
            }
        ]
        result = self._verify(content)
        self.assertFalse(result.ok)
        self.assertTrue(any("rating" in e for e in result.errors))

    def test_amenity_mismatch_fails(self):
        content = [
            {
                "type": "recommendation",
                "items": [
                    {
                        "place_id": PLACE_A_ID,
                        "name": "Budget Star PG",
                        "category": "pg",
                        "amenities": ["wifi", "swimming_pool"],
                    }
                ],
            }
        ]
        result = self._verify(content)
        self.assertFalse(result.ok)
        self.assertTrue(any("amenity" in e for e in result.errors))

    def test_uuid_mentioned_in_prose_fails(self):
        content = [
            {"type": "text", "content": f"See option {FAKE_ID} for details."},
        ]
        result = self._verify(content)
        self.assertFalse(result.ok)
        self.assertTrue(any("text mentions place_id" in e for e in result.errors))

    def test_grounded_uuid_mentioned_in_prose_passes(self):
        content = [
            {"type": "text", "content": f"Option {PLACE_A_ID} is the best."},
        ]
        result = self._verify(content)
        self.assertTrue(result.ok)

    def test_comparison_header_must_match_candidate_name(self):
        content = [
            {
                "type": "comparison",
                "headers": ["Budget Star PG", "Prime Location PG", "feature"],
                "rows": [],
                "columns": [],
            }
        ]
        result = self._verify(content)
        self.assertTrue(result.ok)

    def test_comparison_fabricated_header_fails(self):
        content = [
            {
                "type": "comparison",
                "headers": ["Budget Star PG", "Totally Fabricated Palace"],
                "rows": [],
                "columns": [],
            }
        ]
        result = self._verify(content)
        self.assertFalse(result.ok)
        self.assertTrue(any("header" in e for e in result.errors))

    def test_empty_payload_passes(self):
        result = verify_ai_output(payload_with([]), self.by_id)
        self.assertTrue(result.ok)

    def test_no_candidates_with_recommendation_fails(self):
        result = verify_ai_output(
            payload_with(
                [
                    {
                        "type": "recommendation",
                        "items": [{"place_id": PLACE_A_ID, "name": "Budget Star PG", "category": "pg"}],
                    }
                ]
            ),
            {},
        )
        self.assertFalse(result.ok)


class ExtractPlaceReferencesTests(SimpleTestCase):
    def test_extracts_items_and_headers(self):
        payload = payload_with(
            [
                {
                    "type": "recommendation",
                    "items": [
                        {"place_id": PLACE_A_ID, "name": "Budget Star PG", "category": "pg"},
                    ],
                },
                {
                    "type": "comparison",
                    "headers": ["Budget Star PG", "feature"],
                    "rows": [],
                    "columns": [],
                },
                {"type": "text", "content": "plain text"},
            ]
        )
        refs = extract_place_references(payload)
        self.assertEqual(len(refs), 3)
        self.assertEqual(refs[0].place_id, PLACE_A_ID)
        self.assertEqual(refs[0].block_type, "recommendation")
        self.assertEqual(refs[1].name, "Budget Star PG")
        self.assertEqual(refs[1].block_type, "comparison")
        self.assertEqual(refs[2].name, "feature")
