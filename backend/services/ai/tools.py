"""
OpenAI Function / Tool Definitions for City Companion.
Ref: TRD.md §9.2, Backend_Schema.md §9.5
"""

TOOLS_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_places",
            "description": "Search for candidate places (PGs, hostels, cafes, restaurants, hospitals, essentials) matching user location, category, budget, and food requirements.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["pg", "hostel", "hotel", "restaurant", "cafe", "hospital", "pharmacy", "local_essential"],
                        "description": "Place category filter.",
                    },
                    "city": {
                        "type": "string",
                        "description": "Target city name (e.g. 'Kanpur', 'Delhi').",
                    },
                    "max_budget": {
                        "type": "number",
                        "description": "Maximum price or monthly budget constraint.",
                    },
                    "food_required": {
                        "type": "boolean",
                        "description": "True if mess or food included facility is required.",
                    },
                    "max_radius_km": {
                        "type": "number",
                        "description": "Search radius limit in kilometers.",
                    },
                    "user_lat": {
                        "type": "number",
                        "description": "User's current or reference latitude.",
                    },
                    "user_lon": {
                        "type": "number",
                        "description": "User's current or reference longitude.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_place_details",
            "description": "Retrieve comprehensive details, pricing, ratings, phone, address, and amenities for a specific place ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "place_id": {
                        "type": "string",
                        "description": "The unique UUID or identifier of the place.",
                    }
                },
                "required": ["place_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_nearby",
            "description": "Find essential places and points of interest near a specific latitude/longitude location within a given radius.",
            "parameters": {
                "type": "object",
                "properties": {
                    "latitude": {
                        "type": "number",
                        "description": "Latitude coordinate of the origin point.",
                    },
                    "longitude": {
                        "type": "number",
                        "description": "Longitude coordinate of the origin point.",
                    },
                    "radius_km": {
                        "type": "number",
                        "description": "Search radius in kilometers (default 2.0).",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category filter.",
                    },
                },
                "required": ["latitude", "longitude"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_places",
            "description": "Compare features, pricing, ratings, distance, and amenities side-by-side for 2 to 4 place IDs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "place_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of 2 to 4 place UUIDs to compare.",
                    }
                },
                "required": ["place_ids"],
            },
        },
    },
]
