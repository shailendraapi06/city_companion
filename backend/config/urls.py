from django.contrib import admin
from django.urls import include, path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from common.responses import success_response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return success_response({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/auth/", include("apps.users.urls")),
    path("api/", include("apps.conversations.urls")),
    path("api/", include("apps.chat.urls")),
    path("api/", include("apps.places.urls")),
    path("api/", include("apps.saved_places.urls")),
    path("api/", include("apps.feedback.urls")),
]
