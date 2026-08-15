from django.contrib import admin

from .models import Place


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "rating", "source", "verified", "last_updated")
    list_filter = ("category", "verified", "source", "last_updated")
    search_fields = ("name", "address", "description", "phone")
    readonly_fields = ("last_updated",)
