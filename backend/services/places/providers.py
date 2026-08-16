from dataclasses import dataclass, field
import json
import urllib.parse
import urllib.request

from apps.places.models import Place
from services.location.distance import haversine_distance


@dataclass
class PlaceCandidate:
    """
    Provider-agnostic place candidate object.
    Used by internal DB search, external APIs, and recommendation engine.
    """

    place_id: str
    name: str
    category: str
    latitude: float
    longitude: float
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    website: str | None = None
    rating: float | None = None
    price_range: dict | None = None
    amenities: list[str] = field(default_factory=list)
    opening_hours: dict | None = None
    images: list[str] = field(default_factory=list)
    attributes: dict = field(default_factory=dict)
    source: str = "internal"
    verified: bool = False
    last_updated: str | None = None
    distance_km: float | None = None


def place_to_candidate(p: Place, distance_km: float | None = None) -> PlaceCandidate:
    """Convert a Place ORM row to a provider-agnostic PlaceCandidate.

    Single shared conversion used by InternalDatabaseProvider and by the AI
    service's `get_place_details`/`compare_places` tool handlers so the exact
    same real data is always shown (Backend_Schema.md §9.3).
    """
    return PlaceCandidate(
        place_id=str(p.id),
        name=p.name,
        category=p.category,
        description=p.description,
        address=p.address or "",
        latitude=float(p.latitude),
        longitude=float(p.longitude),
        phone=p.phone,
        website=p.website,
        rating=float(p.rating) if p.rating is not None else None,
        price_range=p.price_range,
        amenities=p.amenities or [],
        opening_hours=p.opening_hours,
        images=p.images or [],
        attributes=p.attributes or {},
        source=p.source,
        verified=p.verified,
        last_updated=p.last_updated.isoformat() if p.last_updated else None,
        distance_km=distance_km,
    )


class InternalDatabaseProvider:
    """Provider for querying internal database Place model."""

    def search(
        self,
        category: str | None = None,
        city: str | None = None,
        user_lat: float | None = None,
        user_lon: float | None = None,
        radius_km: float | None = None,
    ) -> list[PlaceCandidate]:
        queryset = Place.objects.all()

        if category and category.strip():
            cat = category.strip().lower()
            queryset = queryset.filter(category__iexact=cat)

        if city and city.strip():
            c = city.strip()
            queryset = queryset.filter(address__icontains=c)

        candidates: list[PlaceCandidate] = []
        for p in queryset:
            dist = None
            if user_lat is not None and user_lon is not None:
                p_lat = float(p.latitude)
                p_lon = float(p.longitude)
                dist = haversine_distance(user_lat, user_lon, p_lat, p_lon)
                if radius_km is not None and dist > radius_km:
                    continue

            candidates.append(place_to_candidate(p, distance_km=dist))

        return candidates


class ExternalPlacesProvider:
    """
    Provider for fetching candidate places from external places/maps services.

    MVP DECISION (documented, intentional): the external provider is
    OpenStreetMap / Nominatim's free search API. It requires no API key, which
    is why PLACES_API_KEY is deliberately NOT used anywhere in this codebase
    for the MVP. The key was reserved back in Phase 1 for a commercial
    Places/Maps provider ([TBD] in TRD.md §12/§19); it was removed from
    .env.example as dead config and this gap is recorded in TRD.md §19. When a
    commercial provider is integrated, PLACES_API_KEY will be reintroduced
    and read here.
    """

    def search(
        self,
        category: str | None = None,
        city: str | None = None,
        user_lat: float | None = None,
        user_lon: float | None = None,
        radius_km: float | None = None,
    ) -> list[PlaceCandidate]:
        if not category and not city and user_lat is None:
            return []

        # Query Nominatim API for candidate places
        query_str = f"{category or ''} {city or ''}".strip()
        if not query_str:
            query_str = "amenity"

        url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query_str)}&format=json&limit=10"
        req = urllib.request.Request(url, headers={"User-Agent": "CityCompanionApp/1.0"})

        try:
            with urllib.request.urlopen(req, timeout=3) as response:
                if response.status != 200:
                    return []
                items = json.loads(response.read().decode("utf-8"))
        except Exception:
            return []

        candidates: list[PlaceCandidate] = []
        for idx, item in enumerate(items):
            try:
                lat = float(item["lat"])
                lon = float(item["lon"])
            except (KeyError, ValueError):
                continue

            dist = None
            if user_lat is not None and user_lon is not None:
                dist = haversine_distance(user_lat, user_lon, lat, lon)
                if radius_km is not None and dist > radius_km:
                    continue

            name = item.get("display_name", "").split(",")[0] or f"External {category or 'Place'}"
            cand = PlaceCandidate(
                place_id=f"ext_{item.get('place_id', idx)}",
                name=name,
                category=category or "local_essential",
                address=item.get("display_name"),
                latitude=lat,
                longitude=lon,
                rating=4.0,
                source="external_places_api",
                verified=False,
                distance_km=dist,
            )
            candidates.append(cand)

        return candidates

