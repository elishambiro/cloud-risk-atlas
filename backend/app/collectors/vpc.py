from typing import Any
import boto3
from botocore.exceptions import ClientError
from app.collectors.base import BaseCollector


class VPCCollector(BaseCollector):
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

            vpcs = self._paginate(ec2, "describe_vpcs", "Vpcs")
            for vpc in vpcs:
                vpc_id = vpc["VpcId"]
                arn = f"arn:aws:ec2:{self.region}:{self.account_id}:vpc/{vpc_id}"
                resources.append({
                    "resource_id": arn,
                    "type": "VPC",
                    "name": vpc_id,
                    "account_id": self.account_id,
                    "region": self.region,
                    "tags": {t["Key"]: t["Value"] for t in vpc.get("Tags", [])},
                    "metadata": {
                        "cidr_block": vpc.get("CidrBlock"),
                        "is_default": vpc.get("IsDefault", False),
                        "dhcp_options_id": vpc.get("DhcpOptionsId"),
                    },
                    "raw": vpc,
                })

            subnets = self._paginate(ec2, "describe_subnets", "Subnets")
            for subnet in subnets:
                subnet_id = subnet["SubnetId"]
                arn = f"arn:aws:ec2:{self.region}:{self.account_id}:subnet/{subnet_id}"
                resources.append({
                    "resource_id": arn,
                    "type": "SUBNET",
                    "name": subnet_id,
                    "account_id": self.account_id,
                    "region": self.region,
                    "tags": {t["Key"]: t["Value"] for t in subnet.get("Tags", [])},
                    "metadata": {
                        "vpc_id": subnet.get("VpcId"),
                        "cidr_block": subnet.get("CidrBlock"),
                        "availability_zone": subnet.get("AvailabilityZone"),
                        "map_public_ip_on_launch": subnet.get("MapPublicIpOnLaunch", False),
                    },
                    "raw": subnet,
                })

            igws = self._paginate(ec2, "describe_internet_gateways", "InternetGateways")
            for igw in igws:
                igw_id = igw["InternetGatewayId"]
                arn = f"arn:aws:ec2:{self.region}:{self.account_id}:internet-gateway/{igw_id}"
                resources.append({
                    "resource_id": arn,
                    "type": "IGW",
                    "name": igw_id,
                    "account_id": self.account_id,
                    "region": self.region,
                    "tags": {t["Key"]: t["Value"] for t in igw.get("Tags", [])},
                    "metadata": {
                        "attachments": igw.get("Attachments", []),
                    },
                    "raw": igw,
                })

        except ClientError as e:
            self.logger.warning("VPC collection error", error=str(e))

        return resources
