from typing import Any
import networkx as nx
from app.rules.base import Rule


class EC2PublicIP(Rule):
    rule_id = "EC2_PUBLIC_IP"
    title = "EC2 Instance Has Public IP Address"
    severity = "medium"
    resource_types = ["EC2_INSTANCE"]

    def evaluate(
        self, resource_id: str, resource_data: dict[str, Any], graph: nx.DiGraph
    ) -> dict[str, Any] | None:
        meta = resource_data.get("metadata", {})
        name = resource_data.get("name", resource_id)
        public_ip = meta.get("public_ip")

        if not public_ip:
            return None

        return {
            "rule_id": self.rule_id,
            "title": self.title,
            "severity": "medium",
            "score": 40.0,
            "explanation": (
                f"EC2 instance '{name}' has a public IP address ({public_ip}). "
                "Instances with public IP addresses are directly reachable from the internet."
            ),
            "impact": (
                "The instance is directly exposed to the internet, increasing the attack surface. "
                "Any open ports on this instance can be targeted by automated scanners and attackers. "
                "Data exfiltration and unauthorized access attempts are more likely."
            ),
            "remediation": (
                "Place EC2 instances in private subnets and use a load balancer or NAT gateway for outbound access. "
                "If internet access is required, use an Elastic IP with strict security group rules. "
                "Use AWS Systems Manager Session Manager instead of SSH for administrative access. "
                "Regularly audit instances with public IPs and remove unnecessary ones."
            ),
            "metadata": {
                "public_ip": public_ip,
                "instance_type": meta.get("instance_type"),
                "state": meta.get("state"),
            },
        }
