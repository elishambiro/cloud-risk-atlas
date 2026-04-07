from typing import Any
import networkx as nx
from app.rules.base import Rule


class S3NoEncryption(Rule):
    rule_id = "S3_NO_ENCRYPTION"
    title = "S3 Bucket Has No Server-Side Encryption"
    severity = "medium"
    resource_types = ["S3_BUCKET"]

    def evaluate(
        self, resource_id: str, resource_data: dict[str, Any], graph: nx.DiGraph
    ) -> dict[str, Any] | None:
        meta = resource_data.get("metadata", {})
        name = resource_data.get("name", resource_id)

        if meta.get("has_encryption", True):
            return None

        return {
            "rule_id": self.rule_id,
            "title": self.title,
            "severity": "medium",
            "score": 40.0,
            "explanation": (
                f"S3 bucket '{name}' does not have server-side encryption enabled. "
                "Data stored in this bucket is not encrypted at rest."
            ),
            "impact": (
                "Unencrypted data at rest is vulnerable if the underlying storage is compromised. "
                "This may violate compliance requirements such as HIPAA, PCI-DSS, GDPR, and SOC 2. "
                "In the event of unauthorized access, sensitive data can be read without any additional barrier."
            ),
            "remediation": (
                "Enable server-side encryption on the S3 bucket using AES-256 or AWS KMS. "
                "Set a default encryption configuration for the bucket. "
                "Use a bucket policy to deny unencrypted uploads (s3:x-amz-server-side-encryption condition). "
                "Consider using customer-managed KMS keys for additional control over key rotation and access."
            ),
            "metadata": {
                "has_encryption": False,
                "versioning_enabled": meta.get("versioning_enabled", False),
            },
        }
