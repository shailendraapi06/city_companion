from rest_framework import serializers

from apps.users.models import User, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile context (preferred_city, language)."""

    class Meta:
        model = UserProfile
        fields = ["preferred_city", "language"]


class UserSerializer(serializers.ModelSerializer):
    """Full user representation including profile (used for GET /api/auth/me/)."""

    id = serializers.CharField(read_only=True)
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "name", "email", "profile"]


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user representation returned during auth responses."""

    id = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "name", "email"]


class RegisterSerializer(serializers.Serializer):
    """
    Serializer for POST /api/auth/register/
    Ref: API_Specification.md §2.1
    """

    name = serializers.CharField(max_length=150, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=8, required=True)

    def validate_email(self, value):
        normalized_email = value.lower().strip()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("Email already registered.")
        return normalized_email

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            name=validated_data["name"],
        )
        UserProfile.objects.get_or_create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for POST /api/auth/login/
    Ref: API_Specification.md §2.2
    """

    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)


class RefreshTokenSerializer(serializers.Serializer):
    """
    Serializer for POST /api/auth/refresh/
    Ref: API_Specification.md §2.3
    """

    refresh_token = serializers.CharField(required=True)
