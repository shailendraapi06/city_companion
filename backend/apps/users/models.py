import uuid

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class UserManager(BaseUserManager):
    """Custom user manager supporting email as unique identifier."""

    def create_user(self, email, password=None, name="", **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, name="", **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password=password, name=name, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model for City Companion authentication.
    Ref: Backend_Schema.md §2.1
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    def __str__(self):
        return self.email


class UserProfile(models.Model):
    """
    Optional user preference profile linked 1:1 with User.
    Ref: Backend_Schema.md §2.2
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    preferred_city = models.CharField(max_length=100, null=True, blank=True)
    language = models.CharField(max_length=20, null=True, blank=True)
    budget_preferences = models.JSONField(null=True, blank=True)
    location_preferences = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"Profile for {self.user.email}"
