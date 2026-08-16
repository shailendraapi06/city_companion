"""
ChatService — the Conversation-layer orchestration behind POST /api/chat/.

Ref: API_Specification.md §5.2 (ChatView → ChatService → ... → AIService),
§5.5 (conversation memory across calls), TRD.md §5.3 (business logic lives
in services/, not views.py).

This service wires the ALREADY-VERIFIED Phase 5D AI orchestration
(services/ai/service.py AIService.process_user_message) to the Phase 4
Conversation/Message persistence layer. It does NOT reimplement any AI or
recommendation logic — it resolves/creates the conversation, persists the
user turn, assembles the recent-message window (§5.5) and profile context,
delegates to the same AIService entry point the Phase 5D end-to-end tests
exercise, then persists the assistant turn with its structured response_data.

Resolution of the §3.2 [TBD] conversation-creation question:
  - When the frontend sends `conversation_id: null`/omits it, this endpoint
    IMPLICITLY creates a new Conversation and returns its id in the response.
    The frontend does NOT need to pre-create a row via POST /api/conversations/.
  - When a `conversation_id` is supplied it MUST belong to request.user, else
    the ownership helper raises 404 (404-not-403 isolation, §1.2).
"""

import logging

from apps.conversations.models import Conversation, Message
from apps.users.models import UserProfile
from common.permissions import get_owned_object_or_404
from services.ai.service import AIService

logger = logging.getLogger(__name__)

# §5.5 / TRD.md §9.6: "recent N messages" window. Long-thread summarization
# remains a documented [TBD]; this layer passes the window into AIService,
# which applies the same 6-message slice internally.
RECENT_MESSAGES_WINDOW = 6


def _blocks_to_plain_text(blocks: list[dict]) -> str:
    """Best-effort plain-text summary of the AI's structured content blocks,
    used only for the assistant Message.content column. The full structured
    payload is stored in response_data and is what the frontend renders."""
    parts = []
    for block in blocks if isinstance(blocks, list) else []:
        if not isinstance(block, dict):
            continue
        if block.get("type") in ("text", "alert"):
            parts.append(str(block.get("content", "")))
    return "\n".join(part.strip() for part in parts if part and part.strip())


class ChatService:
    """
    Owns the /api/chat/ happy-path orchestration contract.

    `ai_service` is injectable for tests; the default is the real
    AIService with its standard OpenAI + internal/external providers.
    """

    def __init__(self, ai_service: AIService | None = None):
        self.ai_service = ai_service or AIService()

    def process_message(
        self,
        user,
        message: str,
        conversation_id: str | None = None,
        location: dict | None = None,
    ) -> tuple[Conversation, Message]:
        """
        Run one full chat turn and persist both message rows.

        Returns (conversation, assistant_message). The assistant message's
        `response_data` holds the schema-validated structured content blocks.
        """
        conversation = self._resolve_conversation(user, conversation_id)

        # §5.5: recent-messages window assembled BEFORE the new user message is
        # persisted so the AI context contains only PRIOR turns (the frontend
        # never resends history; it only sends message + conversation_id).
        history = self._recent_history(conversation)

        user_message = Message.objects.create(
            conversation=conversation,
            role="user",
            content=message,
        )

        ai_result = self.ai_service.process_user_message(
            user_message=message,
            history=history,
            user_profile=self._user_profile(user),
            location=location,
        )

        content_blocks = ai_result.get("content") or []
        assistant_message = Message.objects.create(
            conversation=conversation,
            role="assistant",
            content=_blocks_to_plain_text(content_blocks),
            response_data=ai_result,
        )

        return conversation, assistant_message

    def _resolve_conversation(self, user, conversation_id: str | None) -> Conversation:
        """
        §3.2 [TBD] resolution: conversation_id None → implicit creation; a
        provided id must belong to `user` (404 otherwise, ownership helper).
        """
        if conversation_id is None:
            return Conversation.objects.create(user=user)
        return get_owned_object_or_404(Conversation, user, id=conversation_id)

    def _recent_history(self, conversation: Conversation) -> list[dict]:
        """Last RECENT_MESSAGES_WINDOW turns as [{role, content}, ...] in
        chronological order, ready for AIService._assemble_context."""
        recent = list(
            Message.objects.filter(conversation=conversation)
            .order_by("-created_at", "-id")[:RECENT_MESSAGES_WINDOW]
        )
        recent.reverse()
        return [{"role": m.role, "content": m.content} for m in recent]

    def _user_profile(self, user) -> dict:
        """Profile context consumed by AIService (preferred_city, language)."""
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return {
            "preferred_city": profile.preferred_city,
            "language": profile.language,
        }
