from typing import Any
from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    type: str
    name: str | None = None
    risk_score: float = 0.0
    severity: str = "none"
    is_internet_reachable: bool = False
    metadata: dict[str, Any] = {}
    account_id: str | None = None
    region: str | None = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relation_type: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    scan_id: str | None = None
