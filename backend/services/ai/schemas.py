"""
Response Content Block Schemas for AI Assistant responses.
Ref: API_Specification.md §5.4, Backend_Schema.md §9.2
"""

ALLOWED_BLOCK_TYPES = {
    "text",
    "heading",
    "list",
    "table",
    "link",
    "image",
    "place",
    "recommendation",
    "comparison",
    "map",
    "alert",
    "action",
}

BLOCK_REQUIRED_FIELDS = {
    "text": ["content"],
    "heading": ["content"],
    "list": ["items"],
    "table": ["headers", "rows"],
    "link": ["title", "url"],
    "image": ["url"],
    "place": ["items"],
    "recommendation": ["items"],
    "comparison": ["headers", "rows"],
    "map": ["center", "markers"],
    "alert": ["level", "content"],
    "action": ["label", "action_type", "payload"],
}
