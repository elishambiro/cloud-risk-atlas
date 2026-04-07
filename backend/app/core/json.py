from typing import Any

from fastapi.encoders import jsonable_encoder


def to_jsonable(value: Any) -> Any:
    """Convert nested values to plain JSON-safe Python types."""
    return jsonable_encoder(value)
