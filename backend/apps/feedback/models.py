from django.conf import settings
from django.db import models


class Feedback(models.Model):
    TYPE_CHOICES = (
        ("up", "👍 Up"),
        ("down", "👎 Down"),
    )

    REASON_CHOICES = (
        ("too_expensive", "Too Expensive"),
        ("too_far", "Too Far"),
        ("not_available", "Not Available"),
        ("wrong_information", "Wrong Information"),
        ("other", "Other"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feedbacks",
    )
    message = models.ForeignKey(
        "conversations.Message",
        on_delete=models.CASCADE,
        related_name="feedbacks",
    )
    place = models.ForeignKey(
        "places.Place",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedbacks",
    )
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    reason = models.CharField(
        max_length=30, choices=REASON_CHOICES, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Feedback ({self.type}) from {self.user.email}"
