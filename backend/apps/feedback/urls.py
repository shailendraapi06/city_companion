from django.urls import path

from apps.feedback.views import FeedbackCreateView

urlpatterns = [
    path("feedback/", FeedbackCreateView.as_view(), name="feedback-create"),
]

