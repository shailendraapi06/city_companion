from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, UserProfile


class UserModelTests(TestCase):
    def test_create_user_hashes_password(self):
        raw_password = "SecretPassword123!"
        user = User.objects.create_user(
            email="testuser@example.com",
            name="Test User",
            password=raw_password,
        )
        self.assertNotEqual(user.password, raw_password)
        self.assertTrue(user.check_password(raw_password))

    def test_email_uniqueness_enforced(self):
        User.objects.create_user(
            email="unique@example.com",
            name="User One",
            password="password123",
        )
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                email="unique@example.com",
                name="User Two",
                password="password456",
            )

    def test_user_profile_links_to_user_with_nullable_fields(self):
        user = User.objects.create_user(
            email="profileuser@example.com",
            name="Profile User",
            password="password123",
        )
        profile = UserProfile.objects.create(user=user)
        self.assertEqual(profile.user, user)
        self.assertEqual(user.profile, profile)
        self.assertIsNone(profile.preferred_city)
        self.assertIsNone(profile.language)
        self.assertIsNone(profile.budget_preferences)
        self.assertIsNone(profile.location_preferences)


class AuthAPITests(APITestCase):
    def setUp(self):
        self.user_email = "authuser@example.com"
        self.user_password = "Password123!"
        self.user_name = "Auth User"
        self.user = User.objects.create_user(
            email=self.user_email,
            name=self.user_name,
            password=self.user_password,
        )
        UserProfile.objects.create(user=self.user, preferred_city="Kanpur", language="hi")

    def test_register_success(self):
        payload = {
            "name": "New User",
            "email": "newuser@example.com",
            "password": "SecurePassword123",
        }
        response = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertIsNone(response.data["error"])
        self.assertEqual(response.data["data"]["user"]["name"], "New User")
        self.assertEqual(response.data["data"]["user"]["email"], "newuser@example.com")
        self.assertIn("access_token", response.data["data"])
        self.assertIn("refresh_token", response.data["data"])

        # Confirm password is not returned in body and is properly hashed in DB
        created_user = User.objects.get(email="newuser@example.com")
        self.assertNotIn("password", response.data["data"]["user"])
        self.assertTrue(created_user.check_password("SecurePassword123"))

    def test_register_duplicate_email(self):
        payload = {
            "name": "Duplicate User",
            "email": self.user_email,
            "password": "SecurePassword123",
        }
        response = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertIsNone(response.data["data"])
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")

    def test_register_short_password(self):
        payload = {
            "name": "Short Password",
            "email": "shortpass@example.com",
            "password": "short",
        }
        response = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")

    def test_login_success(self):
        payload = {"email": self.user_email, "password": self.user_password}
        response = self.client.post("/api/auth/login/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["user"]["email"], self.user_email)
        self.assertIn("access_token", response.data["data"])
        self.assertIn("refresh_token", response.data["data"])
        self.assertNotIn("password", response.data["data"]["user"])

    def test_login_invalid_password(self):
        payload = {"email": self.user_email, "password": "WrongPassword!"}
        response = self.client.post("/api/auth/login/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["code"], "UNAUTHORIZED")
        self.assertEqual(response.data["error"]["message"], "Incorrect email or password")

    def test_login_nonexistent_email(self):
        payload = {"email": "nobody@example.com", "password": "Password123!"}
        response = self.client.post("/api/auth/login/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["code"], "UNAUTHORIZED")
        self.assertEqual(response.data["error"]["message"], "Incorrect email or password")

    def test_refresh_token_success(self):
        refresh = RefreshToken.for_user(self.user)
        payload = {"refresh_token": str(refresh)}
        response = self.client.post("/api/auth/refresh/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("access_token", response.data["data"])

    def test_refresh_token_invalid(self):
        payload = {"refresh_token": "invalid_refresh_token"}
        response = self.client.post("/api/auth/refresh/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["code"], "UNAUTHORIZED")

    def test_logout_success(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        response = self.client.post("/api/auth/logout/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIsNone(response.data["data"])

    def test_logout_blacklists_refresh_token(self):
        """Logout with a refresh_token must invalidate it server-side: the
        refresh endpoint must reject it with 401 afterwards.

        Ref: API_Specification.md §2.3 & §2.4. Fix 5: token_blacklist app is
        installed and LogoutView really calls token.blacklist().
        """
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = self.client.post(
            "/api/auth/logout/", {"refresh_token": str(refresh)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Old refresh token must no longer be usable.
        refresh_response = self.client.post(
            "/api/auth/refresh/", {"refresh_token": str(refresh)}, format="json"
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(refresh_response.data["success"])
        self.assertEqual(refresh_response.data["error"]["code"], "UNAUTHORIZED")

        # The freshly issued access token is still valid (short-lived window).
        me_response = self.client.get("/api/auth/me/")
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)

    def test_me_authenticated(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["id"], str(self.user.id))
        self.assertEqual(response.data["data"]["name"], self.user_name)
        self.assertEqual(response.data["data"]["email"], self.user_email)
        self.assertEqual(response.data["data"]["profile"]["preferred_city"], "Kanpur")
        self.assertEqual(response.data["data"]["profile"]["language"], "hi")

    def test_me_unauthenticated(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["error"]["code"], "UNAUTHORIZED")

    def test_no_secret_or_password_hash_leakage(self):
        """
        Confirm no endpoint response body from any auth endpoint ever includes
        a password hash, JWT signing secret, or raw password.
        Ref: API_Specification.md §8 & Prompt 3B requirement
        """
        from django.conf import settings

        raw_password = "SecretTestPassword123!"
        reg_resp = self.client.post(
            "/api/auth/register/",
            {"name": "Secret Check", "email": "secret@example.com", "password": raw_password},
            format="json",
        )
        user = User.objects.get(email="secret@example.com")

        login_resp = self.client.post(
            "/api/auth/login/",
            {"email": "secret@example.com", "password": raw_password},
            format="json",
        )

        refresh_token = login_resp.data["data"]["refresh_token"]
        refresh_resp = self.client.post(
            "/api/auth/refresh/",
            {"refresh_token": refresh_token},
            format="json",
        )

        access_token = login_resp.data["data"]["access_token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        me_resp = self.client.get("/api/auth/me/")

        for resp in [reg_resp, login_resp, refresh_resp, me_resp]:
            content_str = resp.content.decode("utf-8")
            self.assertNotIn(user.password, content_str)
            self.assertNotIn(raw_password, content_str)
            self.assertNotIn(settings.SECRET_KEY, content_str)

    def test_patch_profile_success(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "name": "Updated Name",
            "preferred_city": "Lucknow",
            "language": "en",
        }
        response = self.client.patch("/api/auth/me/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["name"], "Updated Name")
        self.assertEqual(response.data["data"]["profile"]["preferred_city"], "Lucknow")
        self.assertEqual(response.data["data"]["profile"]["language"], "en")

        self.user.refresh_from_db()
        self.assertEqual(self.user.name, "Updated Name")
        self.assertEqual(self.user.profile.preferred_city, "Lucknow")

    def test_delete_account_cascades_user_resources(self):
        from apps.conversations.models import Conversation, Message
        from apps.feedback.models import Feedback
        from apps.places.models import Place
        from apps.saved_places.models import SavedPlace

        # Create user resources
        conv = Conversation.objects.create(user=self.user)
        msg = Message.objects.create(conversation=conv, role="assistant", content="Response")
        place = Place.objects.create(name="Test Mall", category="cafe", latitude=0, longitude=0)
        SavedPlace.objects.create(user=self.user, place=place)
        Feedback.objects.create(user=self.user, message=msg, type="up")

        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = self.client.delete("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Confirm user and all user-owned resources are deleted via CASCADE
        self.assertFalse(User.objects.filter(id=self.user.id).exists())
        self.assertEqual(Conversation.objects.filter(user_id=self.user.id).count(), 0)
        self.assertEqual(Message.objects.filter(conversation_id=conv.id).count(), 0)
        self.assertEqual(SavedPlace.objects.filter(user_id=self.user.id).count(), 0)
        self.assertEqual(Feedback.objects.filter(user_id=self.user.id).count(), 0)



