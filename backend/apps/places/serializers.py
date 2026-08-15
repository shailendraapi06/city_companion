from rest_framework import serializers

from apps.places.models import Place
from apps.saved_places.models import SavedPlace


class PlaceDetailSerializer(serializers.ModelSerializer):
    """
    Detailed Place representation matching API_Specification.md §4.4.
    Computes `is_saved` boolean relative to requesting user.
    """

    id = serializers.CharField(read_only=True)
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = Place
        fields = [
            "id",
            "name",
            "category",
            "description",
            "address",
            "latitude",
            "longitude",
            "phone",
            "website",
            "rating",
            "price_range",
            "amenities",
            "opening_hours",
            "images",
            "source",
            "verified",
            "last_updated",
            "is_saved",
        ]

    def get_is_saved(self, obj) -> bool:
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return SavedPlace.objects.filter(user=request.user, place=obj).exists()
