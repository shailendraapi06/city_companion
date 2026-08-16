"""
POST /api/chat/ — the central product endpoint.

Ref: API_Specification.md §5.1 (request/response contract), §5.2 (processing
chain), §5.5 (conversation memory). The HTTP layer validates the request
shape and formats the standard envelope; all orchestration lives in
ChatService (services/chat/service.py), which delegates to the Phase 5D
verified AIService — no parallel AI logic exists here.
"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from common.responses import error_response, success_response
from services.ai.service import AIUnavailableError
from services.chat.service import ChatService


class ChatView(APIView):
    """
    POST /api/chat/

    Request:
        { "conversation_id": "uuid|null", "message": "string",
          "location": { "lat": float, "lng": float } | null }

    Response 200 (envelope from common/responses.py):
        { "success": true,
          "data": { "conversation_id": "uuid",
                    "message": { "id": "uuid", "role": "assistant" },
                    "content": [ ...structured blocks... ] },
          "error": null }

    Errors (resilience contract, §5.6):
        400 VALIDATION_ERROR — empty/missing message, malformed location.
        401 UNAUTHORIZED    — missing/invalid token (DRF default).
        404 NOT_FOUND       — conversation_id belongs to another user.
        503 AI_UNAVAILABLE  — ONLY when both the AI client AND the deterministic
                              data fallback fail. Any single-layer failure
                              (AI down / data down) still returns a 200 with
                              ranked data or a clarifying fallback.
    """

    permission_classes = [IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.chat_service = ChatService()

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}

        message = data.get("message")
        if not isinstance(message, str) or not message.strip():
            return error_response(
                "VALIDATION_ERROR", "message is required.", status.HTTP_400_BAD_REQUEST
            )

        location = data.get("location")
        if location is not None:
            if not isinstance(location, dict):
                return error_response(
                    "VALIDATION_ERROR",
                    "location must be an object with numeric lat and lng.",
                    status.HTTP_400_BAD_REQUEST,
                )
            try:
                location = {
                    "lat": float(location["lat"]),
                    "lng": float(location["lng"]),
                }
            except (KeyError, TypeError, ValueError):
                return error_response(
                    "VALIDATION_ERROR",
                    "location must include numeric lat and lng.",
                    status.HTTP_400_BAD_REQUEST,
                )

        try:
            conversation, assistant_message = self.chat_service.process_message(
                user=request.user,
                message=message.strip(),
                conversation_id=data.get("conversation_id"),
                location=location,
            )
        except AIUnavailableError:
            return error_response(
                "AI_UNAVAILABLE",
                "The AI service is temporarily unavailable, and we couldn't "
                "retrieve fallback data either. Please try again in a moment.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        response_data = {
            "conversation_id": str(conversation.id),
            "message": {"id": str(assistant_message.id), "role": "assistant"},
            "content": (assistant_message.response_data or {}).get("content", []),
        }
        return success_response(data=response_data, status_code=status.HTTP_200_OK)
