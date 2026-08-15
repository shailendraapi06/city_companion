from django.db import IntegrityError
from django.test import TestCase

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
