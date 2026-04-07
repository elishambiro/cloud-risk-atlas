from typing import Any
import networkx as nx


def _safe_value(v: Any) -> Any:
    """Make a value JSON-serializable."""
    if isinstance(v, dict):
        return {k: _safe_value(val) for k, val in v.items()}
    if isinstance(v, (list, tuple)):
        return [_safe_value(i) for i in v]
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return v


def serialize_graph(graph: nx.DiGraph) -> dict[str, Any]:
    nodes = []
    for node_id, attrs in graph.nodes(data=True):
        nodes.append({
            "id": node_id,
            "type": attrs.get("type", "UNKNOWN"),
            "name": attrs.get("name"),
            "risk_score": attrs.get("risk_score", 0.0),
            "severity": attrs.get("severity", "none"),
            "is_internet_reachable": attrs.get("is_internet_reachable", False),
            "metadata": _safe_value(attrs.get("metadata", {})),
            "account_id": attrs.get("account_id", ""),
            "region": attrs.get("region", ""),
        })

    edges = []
    for i, (source, target, attrs) in enumerate(graph.edges(data=True)):
        edges.append({
            "id": f"edge-{i}",
            "source": source,
            "target": target,
            "relation_type": attrs.get("relation_type", "UNKNOWN"),
        })

    return {"nodes": nodes, "edges": edges}
