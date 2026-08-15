from rest_framework import serializers

from apps.places.models import Place
from apps.saved_places.models import SavedPlace


class SavedPlaceSummaryPlaceSerializer(serializers.ModelSerializer):
    """Place summary shape nested inside GET /api/saved-places/ list."""

    id = serializers.CharField(read_only=True)

    class Meta:
        model = Place
        fields = ["id", "name", "category", "price_range", "rating"]


class SavedPlaceListSerializer(serializers.ModelSerializer):
    """Serializer for GET /api/saved-places/ list endpoint."""

    saved_id = serializers.CharField(source="id", read_only=True)
    place = SavedPlaceSummaryPlaceSerializer(read_only=True)

    class Meta:
        model = SavedPlace
        fields = ["saved_id", "place", "created_at"]


class SavedPlaceResponseSerializer(serializers.ModelSerializer):
    """Serializer for POST /api/places/{id}/save/ response shape."""

    id = serializers.CharField(read_only=True)
    place_id = serializers.CharField(source="place.id", read_only=True)

    class Meta:
        model = SavedPlace
        fields = ["id", "place_id", "created_at"]
