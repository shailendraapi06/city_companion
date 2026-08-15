from rest_framework import serializers

from apps.feedback.models import Feedback


class FeedbackCreateSerializer(serializers.Serializer):
    """
    Serializer for POST /api/feedback/
    Ref: API_Specification.md §4.5
    """

    message_id = serializers.UUIDField(required=True)
    place_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    type = serializers.ChoiceField(choices=["up", "down"], required=True)
    reason = serializers.CharField(
        required=False, allow_null=True, allow_blank=True, default=None
    )

    def validate_reason(self, value):
        if not value:
            return None
        valid_reasons = {choice[0] for choice in Feedback.REASON_CHOICES}
        # Accept reason if in choices or standard reason list
        if value not in valid_reasons:
            raise serializers.ValidationError(
                f"Invalid reason '{value}'. Must be one of: {', '.join(sorted(valid_reasons))}."
            )
        return value


class FeedbackDetailSerializer(serializers.ModelSerializer):
    """Serializer for Feedback response envelope."""

    id = serializers.CharField(read_only=True)
    message_id = serializers.CharField(source="message.id", read_only=True)
    place_id = serializers.CharField(source="place.id", read_only=True, allow_null=True)

    class Meta:
        model = Feedback
        fields = ["id", "message_id", "place_id", "type", "reason", "created_at"]
