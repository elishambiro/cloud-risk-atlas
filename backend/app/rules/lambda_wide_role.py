from typing import Any
import networkx as nx
from app.rules.base import Rule


class LambdaWideRole(Rule):
    rule_id = "LAMBDA_WIDE_ROLE"
    title = "Lambda Function Uses Overly Permissive Execution Role"
    severity = "high"
    resource_types = ["LAMBDA_FUNCTION"]

    def evaluate(
        self, resource_id: str, resource_data: dict[str, Any], graph: nx.DiGraph
    ) -> dict[str, Any] | None:
        meta = resource_data.get("metadata", {})
        name = resource_data.get("name", resource_id)
        role_arn = meta.get("role_arn")

        if not role_arn:
            return None

        # Look up the role in the graph
        if not graph.has_node(role_arn):
            return None

        role_attrs = graph.nodes[role_arn]
        role_meta = role_attrs.get("metadata", {})

        has_wc_action = role_meta.get("has_wildcard_action", False)
        has_wc_resource = role_meta.get("has_wildcard_resource", False)

        if not has_wc_action and not has_wc_resource:
            return None

        role_name = role_attrs.get("name", role_arn)

        return {
            "rule_id": self.rule_id,
            "title": self.title,
            "severity": "high",
            "score": 70.0,
            "explanation": (
                f"Lambda function '{name}' uses execution role '{role_name}' which has wildcard permissions. "
                "If the Lambda function is compromised, an attacker could use these permissions for privilege escalation."
            ),
            "impact": (
                "A compromised Lambda function with an overly permissive execution role can be used "
                "to access, modify, or delete any AWS resource in the account. "
                "This enables lateral movement and complete account takeover scenarios."
            ),
            "remediation": (
                "Create a dedicated IAM role for each Lambda function with only the permissions it needs. "
                "Replace wildcard actions with specific AWS API calls the function uses. "
                "Replace wildcard resources with specific ARNs of resources the function accesses. "
                "Use AWS IAM Access Analyzer to generate least-privilege policies based on actual usage."
            ),
            "metadata": {
                "role_arn": role_arn,
                "role_name": role_name,
                "has_wildcard_action": has_wc_action,
                "has_wildcard_resource": has_wc_resource,
            },
        }
