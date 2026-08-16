from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.places.serializers import PlaceDetailSerializer
from apps.saved_places.models import SavedPlace
from apps.saved_places.serializers import SavedPlaceResponseSerializer
from common.permissions import get_owned_object_or_404
from common.responses import error_response, success_response
from services.places.service import get_place_by_id


class PlaceDetailView(APIView):
    """
    GET /api/places/{id}/ — Read shared place details.
    Computes `is_saved` boolean relative to the requesting user.
    Ref: API_Specification.md §4.4
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        place = get_place_by_id(pk)
        if place is None:
            return error_response(
                "NOT_FOUND", "Place not found.", status.HTTP_404_NOT_FOUND
            )

        serializer = PlaceDetailSerializer(place, context={"request": request})
        return success_response(data=serializer.data, status_code=status.HTTP_200_OK)


class SaveUnsavePlaceView(APIView):
    """
    POST /api/places/{id}/save/ — Save a place for the current user (Idempotent: 201 if created, 200 if existing).
    DELETE /api/places/{id}/save/ — Unsave a place for the current user (204 on success, 404 if not saved).
    Ref: API_Specification.md §4.1 & §4.2
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        place = get_place_by_id(pk)
        if place is None:
            return error_response(
                "NOT_FOUND", "Place not found.", status.HTTP_404_NOT_FOUND
            )

        saved_place, created = SavedPlace.objects.get_or_create(
            user=request.user, place=place
        )
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        serializer = SavedPlaceResponseSerializer(saved_place)
        return success_response(data=serializer.data, status_code=status_code)

    def delete(self, request, pk):
        saved_place = get_owned_object_or_404(SavedPlace, request.user, place_id=pk)
        saved_place.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
