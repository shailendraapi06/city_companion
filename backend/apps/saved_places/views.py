import math
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.saved_places.models import SavedPlace
from apps.saved_places.serializers import SavedPlaceListSerializer
from common.responses import success_response


class SavedPlacesListView(APIView):
    """
    GET /api/saved-places/ — List current user's saved places.
    Supports optional `?category=` filter on place category.
    Applies standard page/page_size pagination.
    Ref: API_Specification.md §4.3
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = SavedPlace.objects.filter(user=request.user).select_related("place").order_by("-created_at")

        category = request.query_params.get("category")
        if category and category.strip():
            queryset = queryset.filter(place__category__iexact=category.strip())

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (ValueError, TypeError):
            page = 1

        try:
            page_size = max(1, min(100, int(request.query_params.get("page_size", 20))))
        except (ValueError, TypeError):
            page_size = 20

        count = queryset.count()
        total_pages = math.ceil(count / page_size) if count > 0 else 1

        start = (page - 1) * page_size
        end = start + page_size
        page_queryset = queryset[start:end]

        serializer = SavedPlaceListSerializer(page_queryset, many=True)
        data = {
            "results": serializer.data,
            "count": count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }
        return success_response(data=data, status_code=status.HTTP_200_OK)
