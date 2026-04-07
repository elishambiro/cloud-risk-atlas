import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel
from app.config import settings


class TriggerScanRequest(BaseModel):
    account_id: str
    account_name: str | None = None
    region: str
    profile: str | None = None
    role_arn: str | None = None


class TriggerScanResponse(BaseModel):
    scan_id: uuid.UUID
    status: str
    message: str


class TriggerOrganizationScanRequest(BaseModel):
    profile: str
    region: str
    role_name: str = settings.AWS_ORG_MEMBER_ROLE_NAME
    account_ids: list[str] | None = None


class TriggerOrganizationScanResponse(BaseModel):
    scan_ids: list[uuid.UUID]
    status: str
    total_started: int
    message: str


class ScanCreate(BaseModel):
    account_id: str
    account_name: str | None = None
    region: str
    status: str = "pending"


class ScanSummary(BaseModel):
    total_resources: int = 0
    total_findings: int = 0
    total_attack_paths: int = 0
    global_risk_score: float = 0.0
    severity_counts: dict[str, int] = {}


class ScanResponse(BaseModel):
    id: uuid.UUID
    status: str
    account_id: str
    account_name: str | None = None
    region: str
    started_at: datetime
    finished_at: datetime | None = None
    summary: dict[str, Any] | None = None
    error: str | None = None

    model_config = {"from_attributes": True}
