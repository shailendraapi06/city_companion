import json
import logging
from apps.places.models import Place
from services.ai.client import OpenAIClientWrapper
from services.ai.parser import AIValidationError, validate_and_normalize_ai_response
from services.ai.prompts import SYSTEM_PROMPT
from services.ai.tools import TOOLS_DEFINITIONS
from services.places.service import PlaceSearchService
from services.recommendations.scoring import ScoringWeights
from services.recommendations.service import RecommendationEngine

logger = logging.getLogger(__name__)


class AIService:
    """
    Orchestration Engine for City Companion AI pipeline.
    Wires Places Search (5A) + Recommendation Engine (5B) + AI Foundations (5C).
    Enforces Golden Rules #1 & #3: AI never queries DB directly and never has final ranking authority.
    Ref: TRD.md §9.1, §9.3, §9.6
    """

    def __init__(self):
        self.client = OpenAIClientWrapper()
        self.places_service = PlaceSearchService()
        self.rec_engine = RecommendationEngine()

    def process_user_message(
        self,
        user_message: str,
        history: list[dict] | None = None,
        user_profile: dict | None = None,
        top_n: int = 5,
    ) -> dict:
        """
        Executes end-to-end pipeline:
          1. Assemble conversation context.
          2. Initial AI call with tools definitions.
          3. Process tool calls strictly via PlaceSearchService (5A) & RecommendationEngine (5B).
          4. Feed pre-filtered top-N ranked places to AI for explanation.
          5. Validate AI structured output using 5C parser with retry/fallback.
        """
        # 1. Assemble context
        messages = self._assemble_context(user_message, history, user_profile)

        # 2. Initial AI call
        ai_resp = self.client.create_chat_completion(
            messages=messages,
            tools=TOOLS_DEFINITIONS,
        )

        choice = ai_resp.get("choices", [{}])[0]
        message_obj = choice.get("message", {})
        tool_calls = message_obj.get("tool_calls", [])

        # If AI didn't request a tool call, attempt to extract intent or execute search directly
        if not tool_calls:
            # Check if query implies a search (e.g. mentions category/budget)
            search_query_implied = any(
                term in user_message.lower()
                for term in ["pg", "hostel", "hotel", "cafe", "restaurant", "hospital", "food", "budget", "near"]
            )
            if search_query_implied:
                # Force tool execution for search_places
                tool_calls = [
                    {
                        "id": "forced_call_1",
                        "type": "function",
                        "function": {
                            "name": "search_places",
                            "arguments": json.dumps({"city": "Kanpur"}),
                        },
                    }
                ]

        if tool_calls:
            return self._handle_tool_calls_and_explain(
                messages, message_obj, tool_calls, user_message, top_n
            )

        # If purely conversational response
        raw_text = message_obj.get("content") or "How can I help you discover places in your city today?"
        fallback_payload = {
            "message": {"role": "assistant"},
            "content": [{"type": "text", "content": raw_text}],
        }
        return validate_and_normalize_ai_response(fallback_payload)

    def _assemble_context(
        self,
        user_message: str,
        history: list[dict] | None = None,
        user_profile: dict | None = None,
    ) -> list[dict]:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if user_profile:
            profile_str = f"User Profile Context: Preferred City={user_profile.get('preferred_city', 'Kanpur')}, Language={user_profile.get('language', 'en')}"
            messages.append({"role": "system", "content": profile_str})

        # Recent N messages window (e.g. last 6 messages)
        if history:
            recent_window = history[-6:]
            for msg in recent_window:
                if isinstance(msg, dict) and "role" in msg and "content" in msg:
                    messages.append({"role": msg["role"], "content": msg["content"]})

        messages.append({"role": "user", "content": user_message})
        return messages

    def _handle_tool_calls_and_explain(
        self,
        messages: list[dict],
        assistant_msg: dict,
        tool_calls: list[dict],
        user_query: str,
        top_n: int,
    ) -> dict:
        messages.append(assistant_msg)

        all_candidates_data = []

        for call in tool_calls:
            func = call.get("function", {})
            name = func.get("name")
            args_str = func.get("arguments", "{}")

            try:
                args = json.loads(args_str)
            except Exception:
                args = {}

            if name in ["search_places", "search_nearby"]:
                category = args.get("category")
                city = args.get("city") or "Kanpur"
                max_budget = args.get("max_budget")
                max_radius_km = args.get("max_radius_km") or args.get("radius_km")
                food_required = bool(args.get("food_required"))
                user_lat = args.get("user_lat") or args.get("latitude")
                user_lon = args.get("user_lon") or args.get("longitude")

                # Detect priority override signal
                weights = self._determine_weights(user_query, args)

                # 5A: Fetch candidate places
                candidates = self.places_service.search(
                    category=category,
                    city=city,
                    user_lat=user_lat,
                    user_lon=user_lon,
                    max_budget=max_budget,
                    max_radius_km=max_radius_km,
                    food_required=food_required,
                )

                # 5B: Deterministic Scoring & Ranking
                scored_ranked = self.rec_engine.recommend(
                    candidates=candidates,
                    max_budget=max_budget,
                    required_amenities=["food"] if food_required else None,
                    max_radius_km=max_radius_km,
                    weights=weights,
                )

                # HARD CAP: Enforce top-N limit (Golden Rule #1)
                top_n_candidates = scored_ranked[:top_n]

                candidates_data = [
                    {
                        "place_id": sc.candidate.place_id,
                        "name": sc.candidate.name,
                        "category": sc.candidate.category,
                        "address": sc.candidate.address,
                        "latitude": sc.candidate.latitude,
                        "longitude": sc.candidate.longitude,
                        "price_range": sc.candidate.price_range,
                        "rating": sc.candidate.rating,
                        "amenities": sc.candidate.amenities,
                        "distance_km": sc.candidate.distance_km,
                        "match_score": sc.score.total,
                        "rank": sc.rank,
                        "reason": sc.score.reason,
                        "score_breakdown": {
                            "budget": sc.score.budget,
                            "requirement": sc.score.requirement,
                            "distance": sc.score.distance,
                            "rating": sc.score.rating,
                            "quality": sc.score.quality,
                        },
                    }
                    for sc in top_n_candidates
                ]
                all_candidates_data.extend(candidates_data)

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id", "call_1"),
                        "content": json.dumps(
                            {
                                "status": "success",
                                "count": len(candidates_data),
                                "places": candidates_data,
                            }
                        ),
                    }
                )

        # Handle No-Strong-Match case
        is_no_strong_match = not all_candidates_data or all(
            c["match_score"] < 35.0 for c in all_candidates_data
        )

        if is_no_strong_match:
            messages.append(
                {
                    "role": "system",
                    "content": "Note: No places strongly matched the exact budget/location criteria. Kindly inform the user gracefully and suggest expanding their budget or search radius.",
                }
            )

        # Second AI call to generate structured explanation payload
        try:
            explanation_resp = self.client.create_chat_completion(
                messages=messages,
                response_format={"type": "json_object"},
            )
            raw_content = explanation_resp["choices"][0]["message"]["content"]
            parsed_payload = json.loads(raw_content)
            return validate_and_normalize_ai_response(parsed_payload)
        except Exception as e:
            logger.warning(f"AI response validation failed or error occurred: {e}. Falling back to default structured output.")
            return self._build_fallback_structured_response(all_candidates_data, is_no_strong_match)

    def _determine_weights(self, user_query: str, args: dict) -> ScoringWeights:
        """Determines whether to apply priority weight overrides."""
        query_l = user_query.lower()
        if "location" in query_l or "distance" in query_l or "nearby" in query_l or "close" in query_l:
            return ScoringWeights(
                distance=50.0,
                budget=10.0,
                requirement=20.0,
                rating=10.0,
                quality=10.0,
            )
        elif "cheap" in query_l or "budget" in query_l or "price" in query_l:
            return ScoringWeights(
                budget=50.0,
                distance=10.0,
                requirement=20.0,
                rating=10.0,
                quality=10.0,
            )
        return ScoringWeights()

    def _build_fallback_structured_response(
        self, candidates_data: list[dict], no_match: bool
    ) -> dict:
        """Generates a guaranteed valid structured block payload as fallback."""
        blocks = []
        if no_match or not candidates_data:
            blocks.append(
                {
                    "type": "alert",
                    "level": "info",
                    "content": "We couldn't find exact matches for your budget/radius. Consider adjusting your search filters.",
                }
            )
            blocks.append(
                {
                    "type": "text",
                    "content": "I couldn't find any places matching those exact criteria in our verified database. Try increasing your maximum budget or expanding your preferred radius.",
                }
            )
        else:
            blocks.append(
                {
                    "type": "text",
                    "content": f"I found {len(candidates_data)} top verified matching place(s) for you in Kanpur:",
                }
            )
            blocks.append(
                {
                    "type": "recommendation",
                    "items": candidates_data,
                }
            )

        fallback_payload = {
            "message": {"role": "assistant"},
            "content": blocks,
        }
        return validate_and_normalize_ai_response(fallback_payload)
