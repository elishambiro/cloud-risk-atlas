from typing import Any
import networkx as nx
from app.rules.base import Rule


class S3PublicACL(Rule):
    rule_id = "S3_PUBLIC_ACL"
    title = "S3 Bucket is Publicly Accessible"
    severity = "critical"
    resource_types = ["S3_BUCKET"]

    def evaluate(
        self, resource_id: str, resource_data: dict[str, Any], graph: nx.DiGraph
    ) -> dict[str, Any] | None:
        meta = resource_data.get("metadata", {})
        name = resource_data.get("name", resource_id)

        if not meta.get("is_public", False):
            return None

        return {
            "rule_id": self.rule_id,
            "title": self.title,
            "severity": "critical",
            "score": 90.0,
            "explanation": (
                f"S3 bucket '{name}' is publicly accessible via ACL or bucket policy. "
                "The bucket grants read or write access to all internet users."
            ),
            "impact": (
                "Sensitive data stored in this bucket is exposed to the public internet. "
                "Unauthorized users can read, download, or potentially modify bucket contents. "
                "This can lead to data breaches, compliance violations, and reputational damage."
            ),
            "remediation": (
                "Immediately restrict bucket access by removing public ACL grants. "
                "Enable S3 Block Public Access settings at the bucket and account level. "
                "Review and update the bucket policy to deny public access. "
                "Use pre-signed URLs for temporary access to private objects instead of making buckets public."
            ),
            "metadata": {
                "is_public": True,
                "has_policy": meta.get("policy") is not None,
            },
        }
