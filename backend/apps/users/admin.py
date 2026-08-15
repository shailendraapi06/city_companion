from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, UserProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "name", "is_active", "is_staff", "created_at")
    list_filter = ("is_active", "is_staff", "created_at")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("name",)}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "created_at")}),
    )
    readonly_fields = ("created_at", "last_login")
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "name", "password1", "password2"),
            },
        ),
    )
    search_fields = ("email", "name")
    ordering = ("email",)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "preferred_city", "language")
    search_fields = ("user__email", "user__name", "preferred_city")
