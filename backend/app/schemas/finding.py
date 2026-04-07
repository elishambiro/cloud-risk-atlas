import uuid
from typing import Any
from pydantic import BaseModel


class FindingResponse(BaseModel):
    id: uuid.UUID
    scan_id: uuid.UUID
    resource_id: str
    resource_name: str | None = None
    resource_type: str | None = None
    rule_id: str
    title: str
    severity: str
    score: float
    explanation: str
    impact: str
    remediation: str
    metadata: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class FindingDetail(FindingResponse):
    pass


class FindingsPage(BaseModel):
    items: list[FindingResponse]
    total: int
    limit: int
    offset: int
    has_more: bool
