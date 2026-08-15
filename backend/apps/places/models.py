import uuid

from django.db import models


class Place(models.Model):
    CATEGORY_CHOICES = (
        ("hotel", "Hotel"),
        ("pg", "PG"),
        ("hostel", "Hostel"),
        ("restaurant", "Restaurant"),
        ("cafe", "Cafe"),
        ("hospital", "Hospital"),
        ("pharmacy", "Pharmacy"),
        ("local_essential", "Local Essential"),
    )

    SOURCE_CHOICES = (
        ("internal", "Internal Database"),
        ("external_places_api", "External Places API"),
        ("admin_entered", "Admin Entered"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, db_index=True)
    description = models.TextField(null=True, blank=True)
    address = models.CharField(max_length=500, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    phone = models.CharField(max_length=20, null=True, blank=True)
    website = models.URLField(null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    price_range = models.JSONField(null=True, blank=True)
    source = models.CharField(max_length=50, choices=SOURCE_CHOICES, default="admin_entered")
    verified = models.BooleanField(default=False)
    last_updated = models.DateTimeField(auto_now=True)
    amenities = models.JSONField(null=True, blank=True)
    opening_hours = models.JSONField(null=True, blank=True)
    images = models.JSONField(null=True, blank=True)
    attributes = models.JSONField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["category", "verified"]),
        ]
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"
