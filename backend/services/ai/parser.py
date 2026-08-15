"""
Payload Validator and Normalizer for AI Assistant responses.
Ref: TRD.md §9.4, API_Specification.md §5.4
"""

from services.ai.schemas import ALLOWED_BLOCK_TYPES, BLOCK_REQUIRED_FIELDS


class AIValidationError(Exception):
    """Raised when an AI payload fails contract validation."""

    pass


def validate_and_normalize_ai_response(payload: dict) -> dict:
    """
    Validates a raw dictionary payload from the AI model against the response schema.
    Returns normalized structure if valid; raises AIValidationError if invalid.
    """
    if not isinstance(payload, dict):
        raise AIValidationError("Payload must be a JSON object (dictionary).")

    if "message" not in payload or not isinstance(payload["message"], dict):
        raise AIValidationError("Payload missing required 'message' object.")

    if payload["message"].get("role") != "assistant":
        raise AIValidationError("message.role must be 'assistant'.")

    if "content" not in payload or not isinstance(payload["content"], list):
        raise AIValidationError("Payload missing required 'content' list.")

    normalized_content = []
    for idx, block in enumerate(payload["content"]):
        if not isinstance(block, dict):
            raise AIValidationError(f"Block at index {idx} must be a JSON object.")

        block_type = block.get("type")
        if not block_type or not isinstance(block_type, str):
            raise AIValidationError(f"Block at index {idx} missing string 'type' field.")

        if block_type not in ALLOWED_BLOCK_TYPES:
            raise AIValidationError(
                f"Block at index {idx} has unsupported type '{block_type}'. "
                f"Allowed types: {sorted(list(ALLOWED_BLOCK_TYPES))}."
            )

        # Check required fields for block type
        req_fields = BLOCK_REQUIRED_FIELDS.get(block_type, [])
        for field in req_fields:
            if field not in block or block[field] is None:
                raise AIValidationError(
                    f"Block at index {idx} (type '{block_type}') missing required field '{field}'."
                )

        # Extra validation for recommendation/place blocks
        if block_type in ["recommendation", "place"]:
            items = block.get("items")
            if not isinstance(items, list):
                raise AIValidationError(
                    f"Block at index {idx} (type '{block_type}') 'items' must be a list."
                )

        normalized_content.append(block)

    return {
        "message": {"role": "assistant"},
        "content": normalized_content,
    }
