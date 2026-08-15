from rest_framework import serializers

from apps.conversations.models import Conversation, Message


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for conversation list and detail metadata."""

    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True, allow_null=True)
    city = serializers.CharField(read_only=True, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "title", "city", "created_at", "updated_at"]


class ConversationCreateSerializer(serializers.Serializer):
    """
    Serializer for creating a new conversation.
    Ref: API_Specification.md §3.2
    """

    city = serializers.CharField(
        max_length=100, required=False, allow_null=True, allow_blank=True, default=None
    )

    def create(self, validated_data):
        user = self.context["request"].user
        city = validated_data.get("city")
        return Conversation.objects.create(user=user, city=city)


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for conversation message history."""

    id = serializers.CharField(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "role", "content", "response_data", "created_at"]
