from typing import Any
import networkx as nx
from app.rules.registry import RuleRegistry
from app.core.logging import get_logger

logger = get_logger(__name__)

SEVERITY_WEIGHTS = {
    "critical": 90,
    "high": 70,
    "medium": 40,
    "low": 15,
    "none": 0,
}

SEVERITY_ORDER = ["critical", "high", "medium", "low", "none"]


def _compute_severity(score: float) -> str:
    if score >= 80:
        return "critical"
    elif score >= 60:
        return "high"
    elif score >= 30:
        return "medium"
    elif score > 0:
        return "low"
    return "none"


class RiskEngine:
    def __init__(self):
        self.registry = RuleRegistry()

    def analyze(self, graph: nx.DiGraph) -> list[dict[str, Any]]:
        all_findings: list[dict[str, Any]] = []

        for node_id, attrs in graph.nodes(data=True):
            resource_type = attrs.get("type", "")
            rules = self.registry.get_rules_for_type(resource_type)

            if not rules:
                continue

            node_findings = []
            for rule in rules:
                try:
                    finding = rule.evaluate(node_id, attrs, graph)
                    if finding:
                        finding["resource_id"] = node_id
                        node_findings.append(finding)
                        all_findings.append(finding)
                except Exception as e:
                    logger.warning(
                        "Rule evaluation error",
                        rule=rule.rule_id,
                        resource=node_id,
                        error=str(e),
                    )

            if node_findings:
                max_score = max(f.get("score", 0) for f in node_findings)
                additive = sum(
                    f.get("score", 0) * 0.1
                    for f in node_findings
                    if f.get("score", 0) < max_score
                )
                risk_score = min(100.0, max_score + additive)
                severity = _compute_severity(risk_score)
            else:
                risk_score = 0.0
                severity = "none"

            graph.nodes[node_id]["risk_score"] = risk_score
            graph.nodes[node_id]["severity"] = severity

        logger.info("Risk analysis complete", total_findings=len(all_findings))
        return all_findings
