from django.contrib import admin

from .models import SavedPlace


@admin.register(SavedPlace)
class SavedPlaceAdmin(admin.ModelAdmin):
    list_display = ("user", "place", "created_at")
    list_filter = ("created_at", "place__category")
    search_fields = ("user__email", "place__name")
