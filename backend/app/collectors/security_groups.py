from typing import Any
import boto3
from botocore.exceptions import ClientError
from app.collectors.base import BaseCollector

OPEN_CIDRS = {"0.0.0.0/0", "::/0"}


def _parse_rules(ip_permissions: list[dict]) -> list[dict[str, Any]]:
    rules = []
    for perm in ip_permissions:
        from_port = perm.get("FromPort", -1)
        to_port = perm.get("ToPort", -1)
        protocol = perm.get("IpProtocol", "-1")
        cidr_ranges = [r["CidrIp"] for r in perm.get("IpRanges", [])]
        cidr_ranges += [r["CidrIpv6"] for r in perm.get("Ipv6Ranges", [])]
        rules.append({
            "protocol": protocol,
            "from_port": from_port,
            "to_port": to_port,
            "cidr_ranges": cidr_ranges,
        })
    return rules


class SGCollector(BaseCollector):
    def __init__(self, session: boto3.Session, region: str):
        super().__init__(session, region)
        self.account_id = ""

    def collect(self) -> list[dict[str, Any]]:
        resources = []

        try:
            ec2 = self.session.client("ec2", region_name=self.region)
            sts = self.session.client("sts")
            try:
                self.account_id = sts.get_caller_identity()["Account"]
            except ClientError:
                self.account_id = "unknown"

            sgs = self._paginate(ec2, "describe_security_groups", "SecurityGroups")
            for sg in sgs:
                sg_id = sg["GroupId"]
                arn = f"arn:aws:ec2:{self.region}:{self.account_id}:security-group/{sg_id}"

                inbound_rules = _parse_rules(sg.get("IpPermissions", []))
                outbound_rules = _parse_rules(sg.get("IpPermissionsEgress", []))

                has_open_inbound_all = False
                open_ports = []
                for rule in inbound_rules:
                    if any(c in OPEN_CIDRS for c in rule["cidr_ranges"]):
                        has_open_inbound_all = True
                        if rule.get("from_port") is not None and rule["from_port"] != -1:
                            if rule["from_port"] == rule["to_port"]:
                                open_ports.append(rule["from_port"])
                            else:
                                open_ports.append(f"{rule['from_port']}-{rule['to_port']}")
                        else:
                            open_ports.append("all")

                resources.append({
                    "resource_id": arn,
                    "type": "SECURITY_GROUP",
                    "name": sg.get("GroupName", sg_id),
                    "account_id": self.account_id,
                    "region": self.region,
                    "tags": {t["Key"]: t["Value"] for t in sg.get("Tags", [])},
                    "metadata": {
                        "vpc_id": sg.get("VpcId"),
                        "inbound_rules": inbound_rules,
                        "outbound_rules": outbound_rules,
                        "has_open_inbound_all": has_open_inbound_all,
                        "open_ports": open_ports,
                        "group_name": sg.get("GroupName"),
                        "description": sg.get("Description"),
                    },
                    "raw": sg,
                })

        except ClientError as e:
            self.logger.warning("SecurityGroup collection error", error=str(e))

        return resources
