from typing import Any
import networkx as nx
from app.rules.base import Rule


class IAMWildcardPolicy(Rule):
    rule_id = "IAM_WILDCARD_POLICY"
    title = "IAM Role Has Wildcard Permissions"
    severity = "high"
    resource_types = ["IAM_ROLE"]

    def evaluate(
        self, resource_id: str, resource_data: dict[str, Any], graph: nx.DiGraph
    ) -> dict[str, Any] | None:
        meta = resource_data.get("metadata", {})
        name = resource_data.get("name", resource_id)

        has_wc_action = meta.get("has_wildcard_action", False)
        has_wc_resource = meta.get("has_wildcard_resource", False)

        if not has_wc_action and not has_wc_resource:
            return None

        violations = []
        if has_wc_action:
            violations.append("wildcard action (*)")
        if has_wc_resource:
            violations.append("wildcard resource (*)")

        return {
            "rule_id": self.rule_id,
            "title": self.title,
            "severity": "high",
            "score": 70.0,
            "explanation": (
                f"IAM role '{name}' has policies with overly permissive {' and '.join(violations)}. "
                "This grants excessive permissions that violate the principle of least privilege."
            ),
            "impact": (
                "If this role is compromised or misused, an attacker could perform any AWS action "
                "on any resource in the account. This can lead to complete account takeover, "
                "data exfiltration, resource destruction, and lateral movement."
            ),
            "remediation": (
                "Replace wildcard actions with specific AWS actions required for the use case. "
                "Replace wildcard resources with specific ARNs of resources that need access. "
                "Use AWS IAM Access Analyzer to identify and remediate overly permissive policies. "
                "Apply the principle of least privilege: grant only the minimum permissions necessary."
            ),
            "metadata": {
                "has_wildcard_action": has_wc_action,
                "has_wildcard_resource": has_wc_resource,
                "violations": violations,
            },
        }
