import math
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.conversations.models import Conversation, Message
from apps.conversations.serializers import (
    ConversationCreateSerializer,
    ConversationSerializer,
    MessageSerializer,
)
from common.permissions import get_owned_object_or_404
from common.responses import error_response, success_response


class ConversationListCreateView(APIView):
    """
    GET /api/conversations/ — List current user's conversations (most recent first).
    POST /api/conversations/ — Create a new conversation for the current user.
    Ref: API_Specification.md §3.1 & §3.2
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Conversation.objects.filter(user=request.user).order_by("-updated_at")

        # Locked decision: Page / page_size pagination standard
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (ValueError, TypeError):
            page = 1

        try:
            page_size = max(1, min(100, int(request.query_params.get("page_size", 20))))
        except (ValueError, TypeError):
            page_size = 20

        count = queryset.count()
        total_pages = math.ceil(count / page_size) if count > 0 else 1

        start = (page - 1) * page_size
        end = start + page_size
        page_queryset = queryset[start:end]

        serializer = ConversationSerializer(page_queryset, many=True)
        data = {
            "results": serializer.data,
            "count": count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }
        return success_response(data=data, status_code=status.HTTP_200_OK)

    def post(self, request):
        serializer = ConversationCreateSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            messages = []
            for field, errors in serializer.errors.items():
                if isinstance(errors, list):
                    messages.append(f"{field}: {' '.join(str(e) for e in errors)}")
                else:
                    messages.append(f"{field}: {errors}")
            err_msg = "; ".join(messages) if messages else "Invalid conversation parameters."
            return error_response("VALIDATION_ERROR", err_msg, status.HTTP_400_BAD_REQUEST)

        conversation = serializer.save()
        output = ConversationSerializer(conversation).data
        return success_response(data=output, status_code=status.HTTP_201_CREATED)


class ConversationDetailView(APIView):
    """
    GET /api/conversations/{id}/ — Fetch metadata for a specific conversation.
    Uses common/permissions.py get_owned_object_or_404 to enforce 404-not-403 isolation.
    Ref: API_Specification.md §3.3
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        conversation = get_owned_object_or_404(Conversation, request.user, id=pk)
        serializer = ConversationSerializer(conversation)
        return success_response(data=serializer.data, status_code=status.HTTP_200_OK)


class ConversationMessagesView(APIView):
    """
    GET /api/conversations/{id}/messages/ — Fetch message history for a conversation.
    Uses common/permissions.py get_owned_object_or_404 to verify conversation ownership.
    Ref: API_Specification.md §3.4
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        conversation = get_owned_object_or_404(Conversation, request.user, id=pk)
        messages = Message.objects.filter(conversation=conversation).order_by("created_at")
        serializer = MessageSerializer(messages, many=True)
        return success_response(data={"results": serializer.data}, status_code=status.HTTP_200_OK)
