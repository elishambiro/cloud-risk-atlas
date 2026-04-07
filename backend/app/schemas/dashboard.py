from typing import Any
from pydantic import BaseModel


class SeverityCount(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    none: int = 0


class TopResource(BaseModel):
    resource_id: str
    name: str | None
    type: str
    risk_score: float
    severity: str
    is_internet_reachable: bool


class TopAttackPath(BaseModel):
    id: str
    title: str
    severity: str
    score: float
    entry_point: str
    target: str
    description: str


class DashboardResponse(BaseModel):
    global_risk_score: float
    severity_counts: SeverityCount
    top_resources: list[TopResource]
    top_attack_paths: list[TopAttackPath]
    total_resources: int
    total_findings: int
    total_attack_paths: int
    scan_info: dict[str, Any]
