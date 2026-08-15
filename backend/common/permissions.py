"""
Reusable ownership and data isolation permissions for City Companion.
Ref: API_Specification.md §1.2 & TRD.md §14

CRITICAL SECURITY RULE (404-NOT-403 Isolation Pattern):
Every query scoped to a user-owned resource (Conversation, Message, SavedPlace, Feedback)
must filter by `request.user`. Attempting to access another user's resource MUST return
a 404 NOT_FOUND error (never a 403 FORBIDDEN), preventing resource existence leakage to
unauthorized users.
"""

from django.http import Http404
from rest_framework.exceptions import NotFound
from rest_framework.permissions import BasePermission


def get_owned_object_or_404(model_or_queryset, user, user_field="user", **kwargs):
    """
    Retrieve a single object belonging to `user`, or raise Http404.

    If an object exists in the database but belongs to a different user,
    filtering by `(user_field=user, **kwargs)` fails and raises Http404 / NotFound.
    This enforces the 404-not-403 privacy requirement across all user-scoped lookups.

    Args:
        model_or_queryset: Django Model class or QuerySet.
        user: The authenticated User object (request.user).
        user_field: Attribute path/name pointing to user (default: 'user', or 'conversation__user').
        **kwargs: Lookup parameters (e.g. id=conversation_id).

    Returns:
        The matched model instance belonging to `user`.

    Raises:
        Http404: If the record does not exist OR belongs to another user.
    """
    if hasattr(model_or_queryset, "objects"):
        queryset = model_or_queryset.objects.all()
    else:
        queryset = model_or_queryset

    filter_kwargs = {user_field: user, **kwargs}
    try:
        return queryset.get(**filter_kwargs)
    except (queryset.model.DoesNotExist, ValueError):
        raise Http404("Resource not found.")


class IsOwner(BasePermission):
    """
    DRF Object-level permission class enforcing ownership isolation.

    If `request.user` does not match the owner of `obj`, it raises DRF's `NotFound`
    (HTTP 404) rather than `PermissionDenied` (HTTP 403), preserving resource privacy.
    """

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, "user", None)
        if owner is None and hasattr(obj, "conversation"):
            owner = getattr(obj.conversation, "user", None)

        if owner != request.user:
            raise NotFound("Resource not found.")
        return True
