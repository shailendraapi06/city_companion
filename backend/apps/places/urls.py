from django.urls import path

from apps.places.views import PlaceDetailView, SaveUnsavePlaceView

urlpatterns = [
    path("places/<uuid:pk>/", PlaceDetailView.as_view(), name="place-detail"),
    path("places/<uuid:pk>/save/", SaveUnsavePlaceView.as_view(), name="place-save-unsave"),
]

