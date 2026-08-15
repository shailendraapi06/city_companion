from django.urls import path

from apps.conversations.views import (
    ConversationDetailView,
    ConversationListCreateView,
    ConversationMessagesView,
)

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation-list-create"),
    path("conversations/<uuid:pk>/", ConversationDetailView.as_view(), name="conversation-detail"),
    path("conversations/<uuid:pk>/messages/", ConversationMessagesView.as_view(), name="conversation-messages"),
]

