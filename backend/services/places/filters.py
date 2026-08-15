from services.places.providers import PlaceCandidate


def filter_by_category(
    candidates: list[PlaceCandidate], category: str | None
) -> list[PlaceCandidate]:
    if not category or not category.strip():
        return candidates
    cat = category.strip().lower()
    return [c for c in candidates if c.category.lower() == cat]


def filter_by_budget(
    candidates: list[PlaceCandidate], max_budget: float | None
) -> list[PlaceCandidate]:
    if max_budget is None or max_budget <= 0:
        return candidates

    filtered = []
    for c in candidates:
        if not c.price_range or "amount" not in c.price_range:
            filtered.append(c)
            continue
        try:
            amount = float(c.price_range["amount"])
            if amount <= max_budget:
                filtered.append(c)
        except (ValueError, TypeError):
            filtered.append(c)

    return filtered


def filter_by_distance(
    candidates: list[PlaceCandidate], max_radius_km: float | None
) -> list[PlaceCandidate]:
    if max_radius_km is None or max_radius_km <= 0:
        return candidates

    return [
        c
        for c in candidates
        if c.distance_km is None or c.distance_km <= max_radius_km
    ]


def filter_by_food_required(
    candidates: list[PlaceCandidate], food_required: bool = False
) -> list[PlaceCandidate]:
    if not food_required:
        return candidates

    filtered = []
    for c in candidates:
        food_in_attrs = bool(c.attributes.get("food_included")) or bool(
            c.attributes.get("mess")
        )
        food_in_amenities = any(
            t in ["food", "mess", "meals", "breakfast", "dinner", "thali"]
            for t in [a.lower() for a in c.amenities]
        )
        if food_in_attrs or food_in_amenities:
            filtered.append(c)

    return filtered


def apply_place_filters(
    candidates: list[PlaceCandidate],
    category: str | None = None,
    max_budget: float | None = None,
    max_radius_km: float | None = None,
    food_required: bool = False,
) -> list[PlaceCandidate]:
    """Applies category, budget, distance, and food filters sequentially."""
    res = filter_by_category(candidates, category)
    res = filter_by_budget(res, max_budget)
    res = filter_by_distance(res, max_radius_km)
    res = filter_by_food_required(res, food_required)
    return res
