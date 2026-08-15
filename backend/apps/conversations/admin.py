from django.contrib import admin

from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("created_at",)
    fields = ("role", "content", "response_data", "created_at")


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "city", "created_at", "updated_at")
    list_filter = ("city", "created_at", "updated_at")
    search_fields = ("title", "city", "user__email", "user__name")
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "role", "short_content", "created_at")
    list_filter = ("role", "created_at")
    search_fields = ("content", "conversation__title", "conversation__user__email")

    def short_content(self, obj):
        return obj.content[:50]

    short_content.short_description = "Content"
