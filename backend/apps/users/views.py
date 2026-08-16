import logging

from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import UserProfile
from apps.users.serializers import (
    LoginSerializer,
    RefreshTokenSerializer,
    RegisterSerializer,
    UserBasicSerializer,
    UserProfileUpdateSerializer,
    UserSerializer,
)
from common.responses import error_response, success_response


logger = logging.getLogger(__name__)


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Register a new user and issue JWT tokens.
    Ref: API_Specification.md §2.1
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            messages = []
            for field, errors in serializer.errors.items():
                if isinstance(errors, list):
                    messages.append(f"{field}: {' '.join(str(e) for e in errors)}")
                else:
                    messages.append(f"{field}: {errors}")
            err_msg = "; ".join(messages) if messages else "Invalid registration details."
            return error_response("VALIDATION_ERROR", err_msg, status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        refresh = RefreshToken.for_user(user)

        data = {
            "user": UserBasicSerializer(user).data,
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
        }
        return success_response(data=data, status_code=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST /api/auth/login/
    Authenticate user and issue JWT tokens.
    Ref: API_Specification.md §2.2
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            messages = []
            for field, errors in serializer.errors.items():
                if isinstance(errors, list):
                    messages.append(f"{field}: {' '.join(str(e) for e in errors)}")
                else:
                    messages.append(f"{field}: {errors}")
            err_msg = "; ".join(messages) if messages else "Invalid login parameters."
            return error_response("VALIDATION_ERROR", err_msg, status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"].lower().strip()
        password = serializer.validated_data["password"]

        user = authenticate(request, email=email, password=password)
        if user is None or not user.is_active:
            # Exact message per API_Specification.md §2.2
            return error_response("UNAUTHORIZED", "Incorrect email or password", status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        data = {
            "user": UserBasicSerializer(user).data,
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
        }
        return success_response(data=data, status_code=status.HTTP_200_OK)


class RefreshTokenView(APIView):
    """
    POST /api/auth/refresh/
    Exchange a valid refresh token for a new access token.
    Ref: API_Specification.md §2.3
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("VALIDATION_ERROR", "refresh_token is required", status.HTTP_400_BAD_REQUEST)

        token_str = serializer.validated_data["refresh_token"]
        try:
            refresh = RefreshToken(token_str)
            access_token = str(refresh.access_token)
        except (TokenError, InvalidToken):
            return error_response("UNAUTHORIZED", "Invalid or expired refresh token", status.HTTP_401_UNAUTHORIZED)

        return success_response(data={"access_token": access_token}, status_code=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Logout current user session.
    Ref: API_Specification.md §2.4
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh_token") if isinstance(request.data, dict) else None
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Logout must always return 200 (API_Specification.md §2.4): the
                # user session is terminated client-side regardless. Log rather
                # than swallow silently so blacklisting failures are visible.
                logger.warning("Logout blacklist failed for refresh token", exc_info=True)

        return success_response(data=None, status_code=status.HTTP_200_OK)


class MeView(APIView):

    """
    GET /api/auth/me/ — Return current authenticated user and profile.
    PATCH /api/auth/me/ — Update current authenticated user's name, preferred_city, or language.
    DELETE /api/auth/me/ — Delete current authenticated user's account (cascades to all user resources).
    Ref: API_Specification.md §2.5 & Phase 4 Part C additions.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        UserProfile.objects.get_or_create(user=request.user)
        serializer = UserSerializer(request.user)
        return success_response(data=serializer.data, status_code=status.HTTP_200_OK)

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            messages = []
            for field, errors in serializer.errors.items():
                if isinstance(errors, list):
                    messages.append(f"{field}: {' '.join(str(e) for e in errors)}")
                else:
                    messages.append(f"{field}: {errors}")
            err_msg = "; ".join(messages) if messages else "Invalid profile parameters."
            return error_response("VALIDATION_ERROR", err_msg, status.HTTP_400_BAD_REQUEST)

        if "name" in serializer.validated_data:
            request.user.name = serializer.validated_data["name"]
            request.user.save()

        if "preferred_city" in serializer.validated_data:
            profile.preferred_city = serializer.validated_data["preferred_city"]
        if "language" in serializer.validated_data:
            profile.language = serializer.validated_data["language"]
        profile.save()

        user_serializer = UserSerializer(request.user)
        return success_response(data=user_serializer.data, status_code=status.HTTP_200_OK)

    def delete(self, request):
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

