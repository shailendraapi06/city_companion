import re
from services.location.distance import haversine_distance
from services.places.filters import apply_place_filters
from services.places.providers import (
    ExternalPlacesProvider,
    InternalDatabaseProvider,
    PlaceCandidate,
)


class PlaceSearchService:
    """
    Unified entry point for searching candidates across internal database
    and external Places API providers with deduplication and filtering.
    Ref: TRD.md §5.1, §12
    """

    def __init__(self):
        self.internal_provider = InternalDatabaseProvider()
        self.external_provider = ExternalPlacesProvider()

    def search(
        self,
        category: str | None = None,
        city: str | None = None,
        user_lat: float | None = None,
        user_lon: float | None = None,
        max_budget: float | None = None,
        max_radius_km: float | None = None,
        food_required: bool = False,
        include_external: bool = True,
    ) -> list[PlaceCandidate]:
        # 1. Fetch internal candidates
        internal_candidates = self.internal_provider.search(
            category=category,
            city=city,
            user_lat=user_lat,
            user_lon=user_lon,
            radius_km=max_radius_km,
        )

        # 2. Fetch external candidates if requested
        external_candidates: list[PlaceCandidate] = []
        if include_external:
            try:
                external_candidates = self.external_provider.search(
                    category=category,
                    city=city,
                    user_lat=user_lat,
                    user_lon=user_lon,
                    radius_km=max_radius_km,
                )
            except Exception:
                external_candidates = []

        # 3. Deduplicate combined candidates
        combined = self._deduplicate(internal_candidates, external_candidates)

        # 4. Apply post-provider filters (category, budget, distance, food)
        filtered = apply_place_filters(
            combined,
            category=category,
            max_budget=max_budget,
            max_radius_km=max_radius_km,
            food_required=food_required,
        )

        return filtered

    def _deduplicate(
        self,
        internal: list[PlaceCandidate],
        external: list[PlaceCandidate],
    ) -> list[PlaceCandidate]:
        """
        Deduplicates internal and external candidates.
        Prefers internal database records over external API duplicates.
        Heuristic: matching normalized name OR coordinate distance < 0.1km (100m).
        """
        result = list(internal)

        def normalize(name: str) -> str:
            return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", "", name.lower())).strip()

        seen_names = {normalize(c.name) for c in result if c.name}

        for ext in external:
            ext_norm_name = normalize(ext.name)
            if ext_norm_name in seen_names:
                continue

            # Check coordinate proximity (< 100m) against internal candidates
            is_dup_location = False
            for int_cand in result:
                dist = haversine_distance(
                    ext.latitude, ext.longitude, int_cand.latitude, int_cand.longitude
                )
                if dist <= 0.1:  # 100 meters
                    is_dup_location = True
                    break

            if not is_dup_location:
                result.append(ext)
                if ext_norm_name:
                    seen_names.add(ext_norm_name)

        return result
