from django.urls import path

from apps.saved_places.views import SavedPlacesListView

urlpatterns = [
    path("saved-places/", SavedPlacesListView.as_view(), name="saved-places-list"),
]

