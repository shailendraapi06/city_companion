from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.conversations.models import Message
from apps.feedback.models import Feedback
from apps.feedback.serializers import (
    FeedbackCreateSerializer,
    FeedbackDetailSerializer,
)
from apps.places.models import Place
from common.permissions import get_owned_object_or_404
from common.responses import error_response, success_response


class FeedbackCreateView(APIView):
    """
    POST /api/feedback/ — Submit feedback (up/down + optional reason) on an AI response message.
    Verifies message ownership via common/permissions.py (message.conversation.user).
    Ref: API_Specification.md §4.5
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FeedbackCreateSerializer(data=request.data)
        if not serializer.is_valid():
            messages = []
            for field, errors in serializer.errors.items():
                if isinstance(errors, list):
                    messages.append(f"{field}: {' '.join(str(e) for e in errors)}")
                else:
                    messages.append(f"{field}: {errors}")
            err_msg = "; ".join(messages) if messages else "Invalid feedback parameters."
            return error_response("VALIDATION_ERROR", err_msg, status.HTTP_400_BAD_REQUEST)

        message_id = serializer.validated_data["message_id"]
        # Enforce message ownership (returns 404 if message belongs to another user's conversation)
        message = get_owned_object_or_404(
            Message, request.user, user_field="conversation__user", id=message_id
        )

        place = None
        place_id = serializer.validated_data.get("place_id")
        if place_id:
            try:
                place = Place.objects.get(id=place_id)
            except Place.DoesNotExist:
                return error_response(
                    "VALIDATION_ERROR", "Invalid place_id.", status.HTTP_400_BAD_REQUEST
                )

        feedback = Feedback.objects.create(
            user=request.user,
            message=message,
            place=place,
            type=serializer.validated_data["type"],
            reason=serializer.validated_data.get("reason"),
        )

        output_serializer = FeedbackDetailSerializer(feedback)
        return success_response(data=output_serializer.data, status_code=status.HTTP_201_CREATED)
