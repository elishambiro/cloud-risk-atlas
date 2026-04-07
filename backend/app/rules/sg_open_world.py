from typing import Any
import networkx as nx
from app.rules.base import Rule

OPEN_CIDRS = {"0.0.0.0/0", "::/0"}
CRITICAL_PORTS = {22, 3389}


class SGOpenInboundAll(Rule):
    rule_id = "SG_OPEN_INBOUND_ALL"
    title = "Security Group Allows Unrestricted Inbound Access"
    severity = "critical"
    resource_types = ["SECURITY_GROUP"]

    def evaluate(
        self, resource_id: str, resource_data: dict[str, Any], graph: nx.DiGraph
    ) -> dict[str, Any] | None:
        meta = resource_data.get("metadata", {})
        inbound_rules = meta.get("inbound_rules", [])
        name = resource_data.get("name", resource_id)

        matching_rules = []
        has_critical = False

        for rule in inbound_rules:
            cidrs = rule.get("cidr_ranges", [])
            from_port = rule.get("from_port", -1)
            to_port = rule.get("to_port", -1)
            protocol = rule.get("protocol", "-1")

            if not any(c in OPEN_CIDRS for c in cidrs):
                continue

            # All traffic (-1 protocol or port range covers all)
            is_all_traffic = (protocol == "-1") or (from_port == -1 and to_port == -1)
            is_ssh = 22 in range(
                min(from_port, to_port) if from_port != -1 else 0,
                max(from_port, to_port) + 1 if to_port != -1 else 65536,
            ) if not is_all_traffic else False
            is_rdp = 3389 in range(
                min(from_port, to_port) if from_port != -1 else 0,
                max(from_port, to_port) + 1 if to_port != -1 else 65536,
            ) if not is_all_traffic else False

            if is_all_traffic or is_ssh or is_rdp:
                has_critical = True

            matching_rules.append({
                "protocol": protocol,
                "from_port": from_port,
                "to_port": to_port,
                "cidrs": cidrs,
            })

        if not matching_rules:
            return None

        severity = "critical" if has_critical else "high"
        score = 90.0 if severity == "critical" else 70.0

        return {
            "rule_id": self.rule_id,
            "title": self.title,
            "severity": severity,
            "score": score,
            "explanation": (
                f"Security group '{name}' allows inbound traffic from the internet (0.0.0.0/0 or ::/0). "
                f"This exposes all associated resources to potential attacks from any IP address."
            ),
            "impact": (
                "Any internet user can attempt to connect to resources in this security group. "
                "This significantly increases the attack surface and risk of unauthorized access, "
                "data breaches, and exploitation of vulnerabilities."
            ),
            "remediation": (
                "Restrict inbound rules to specific IP ranges that require access. "
                "Remove 0.0.0.0/0 and ::/0 CIDR blocks from all inbound rules. "
                "Use VPN, bastion hosts, or AWS Systems Manager Session Manager for administrative access. "
                "Apply the principle of least privilege to network access controls."
            ),
            "metadata": {"matching_rules": matching_rules, "has_critical_ports": has_critical},
        }
