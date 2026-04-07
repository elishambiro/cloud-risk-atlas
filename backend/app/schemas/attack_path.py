import uuid
from typing import Any
from pydantic import BaseModel


class AttackPathResponse(BaseModel):
    id: uuid.UUID
    scan_id: uuid.UUID
    title: str
    path: list[Any]
    severity: str
    score: float
    entry_point: str
    target: str
    description: str

    model_config = {"from_attributes": True}
