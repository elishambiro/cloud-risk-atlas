from typing import Any
import boto3
from botocore.exceptions import ClientError
from app.collectors.base import BaseCollector


def _get_tag(tags: list[dict], key: str) -> str | None:
    for t in tags or []:
        if t.get("Key") == key:
            return t.get("Value")
    return None


class EC2Collector(BaseCollector):
    def __init__(self, session: boto3.Session, region: str):
        super().__init__(session, region)
        self.account_id = ""

    def collect(self) -> list[dict[str, Any]]:
        resources = []
        relationships = []

        try:
            ec2 = self.session.client("ec2", region_name=self.region)
            sts = self.session.client("sts")
            try:
                self.account_id = sts.get_caller_identity()["Account"]
            except ClientError:
                self.account_id = "unknown"

            instances = self._paginate(ec2, "describe_instances", "Reservations")

            for reservation in instances:
                for inst in reservation.get("Instances", []):
                    instance_id = inst["InstanceId"]
                    arn = f"arn:aws:ec2:{self.region}:{self.account_id}:instance/{instance_id}"
                    tags = inst.get("Tags", [])
                    name = _get_tag(tags, "Name") or instance_id

                    sg_ids = [sg["GroupId"] for sg in inst.get("SecurityGroups", [])]
                    iip = inst.get("IamInstanceProfile", {})
                    profile_arn = iip.get("Arn") if iip else None

                    resource = {
                        "resource_id": arn,
                        "type": "EC2_INSTANCE",
                        "name": name,
                        "account_id": self.account_id,
                        "region": self.region,
                        "tags": {t["Key"]: t["Value"] for t in tags},
                        "metadata": {
                            "instance_type": inst.get("InstanceType"),
                            "ami_id": inst.get("ImageId"),
                            "state": inst.get("State", {}).get("Name"),
                            "public_ip": inst.get("PublicIpAddress"),
                            "private_ip": inst.get("PrivateIpAddress"),
                            "vpc_id": inst.get("VpcId"),
                            "subnet_id": inst.get("SubnetId"),
                            "security_group_ids": sg_ids,
                            "iam_instance_profile_arn": profile_arn,
                            "key_name": inst.get("KeyName"),
                            "launch_time": str(inst.get("LaunchTime", "")),
                        },
                        "is_internet_reachable": False,
                        "raw": inst,
                    }
                    resources.append(resource)

                    for sg_id in sg_ids:
                        sg_arn = f"arn:aws:ec2:{self.region}:{self.account_id}:security-group/{sg_id}"
                        relationships.append({
                            "type": "_relationship",
                            "source_id": arn,
                            "target_id": sg_arn,
                            "relation_type": "ATTACHED_TO",
                            "metadata": {},
                        })

        except ClientError as e:
            self.logger.warning("EC2 collection error", error=str(e))

        return resources + relationships
