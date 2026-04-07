from typing import Any
import networkx as nx
from app.normalizer.normalizer import INTERNET_NODE_ID
from app.core.logging import get_logger

logger = get_logger(__name__)

SEVERITY_WEIGHTS = {
    "critical": 90,
    "high": 70,
    "medium": 40,
    "low": 15,
    "none": 0,
}


def _score_path(path: list[str], graph: nx.DiGraph) -> float:
    if not path:
        return 0.0
    scores = []
    for node_id in path:
        node = graph.nodes.get(node_id, {})
        scores.append(node.get("risk_score", 0.0))
    max_score = max(scores) if scores else 0.0
    length_bonus = min(len(path) * 5, 20)
    return min(100.0, max_score + length_bonus)


def _path_severity(score: float) -> str:
    if score >= 80:
        return "critical"
    elif score >= 60:
        return "high"
    elif score >= 30:
        return "medium"
    elif score > 0:
        return "low"
    return "none"


class AttackPathAnalyzer:
    def find_paths(self, graph: nx.DiGraph) -> list[dict[str, Any]]:
        paths_found: list[dict[str, Any]] = []

        entry_points = [INTERNET_NODE_ID]
        for node_id, attrs in graph.nodes(data=True):
            if attrs.get("is_internet_reachable") and node_id != INTERNET_NODE_ID:
                entry_points.append(node_id)

        targets = []
        for node_id, attrs in graph.nodes(data=True):
            node_type = attrs.get("type", "")
            meta = attrs.get("metadata", {})
            risk_score = attrs.get("risk_score", 0.0)

            is_target = False
            if node_type == "S3_BUCKET" and meta.get("is_public"):
                is_target = True
            elif node_type == "IAM_ROLE" and (
                meta.get("has_wildcard_action") or meta.get("has_wildcard_resource")
            ):
                is_target = True
            elif risk_score >= 70:
                is_target = True

            if is_target and node_id not in entry_points:
                targets.append(node_id)

        if not targets:
            sorted_nodes = sorted(
                [(n, d.get("risk_score", 0.0)) for n, d in graph.nodes(data=True)],
                key=lambda x: x[1],
                reverse=True,
            )
            targets = [n for n, _ in sorted_nodes[:5] if n not in entry_points]

        seen_paths: set[tuple[str, ...]] = set()

        for entry in entry_points:
            if not graph.has_node(entry):
                continue
            for target in targets:
                if not graph.has_node(target) or entry == target:
                    continue
                try:
                    for path in nx.all_simple_paths(graph, entry, target, cutoff=5):
                        path_key = tuple(path)
                        if path_key in seen_paths:
                            continue
                        seen_paths.add(path_key)

                        score = _score_path(path, graph)
                        severity = _path_severity(score)
                        target_attrs = graph.nodes.get(target, {})
                        entry_attrs = graph.nodes.get(entry, {})

                        target_name = target_attrs.get("name") or target.split("/")[-1]
                        entry_name = entry_attrs.get("name") or entry.split("/")[-1]

                        description = (
                            f"Attack path from {entry_name} to {target_name} "
                            f"via {len(path) - 2} intermediate node(s). "
                            f"Path traverses: {' → '.join(graph.nodes.get(n, {}).get('name', n.split('/')[-1]) for n in path)}"
                        )

                        paths_found.append({
                            "title": f"Path: {entry_name} → {target_name}",
                            "path": path,
                            "severity": severity,
                            "score": score,
                            "entry_point": entry,
                            "target": target,
                            "description": description,
                        })

                except nx.NetworkXNoPath:
                    pass
                except Exception as e:
                    logger.warning(
                        "Error finding paths",
                        entry=entry,
                        target=target,
                        error=str(e),
                    )

        paths_found.sort(key=lambda p: p["score"], reverse=True)
        logger.info("Attack paths found", count=len(paths_found))
        return paths_found[:20]
