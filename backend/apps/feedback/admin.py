from django.contrib import admin

from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("user", "message", "place", "type", "reason", "created_at")
    list_filter = ("type", "reason", "created_at")
    search_fields = ("user__email", "message__content", "place__name", "reason")
