import json
from typing import Any
import boto3
from botocore.exceptions import ClientError
from app.collectors.base import BaseCollector


def _is_public_acl(acl: dict) -> bool:
    public_grantee_uris = {
        "http://acs.amazonaws.com/groups/global/AllUsers",
        "http://acs.amazonaws.com/groups/global/AuthenticatedUsers",
    }
    for grant in acl.get("Grants", []):
        grantee = grant.get("Grantee", {})
        uri = grantee.get("URI", "")
        if uri in public_grantee_uris:
            return True
    return False


class S3Collector(BaseCollector):
    def __init__(self, session: boto3.Session, region: str):
        super().__init__(session, region)
        self.account_id = ""

    def collect(self) -> list[dict[str, Any]]:
        resources = []

        try:
            s3 = self.session.client("s3")
            sts = self.session.client("sts")
            try:
                self.account_id = sts.get_caller_identity()["Account"]
            except ClientError:
                self.account_id = "unknown"

            response = s3.list_buckets()
            buckets = response.get("Buckets", [])

            for bucket in buckets:
                bucket_name = bucket["Name"]
                arn = f"arn:aws:s3:::{bucket_name}"

                # Get bucket region
                bucket_region = self.region
                try:
                    loc = s3.get_bucket_location(Bucket=bucket_name)
                    bucket_region = loc.get("LocationConstraint") or "us-east-1"
                except ClientError:
                    pass

                # ACL
                is_public = False
                try:
                    acl = s3.get_bucket_acl(Bucket=bucket_name)
                    is_public = _is_public_acl(acl)
                except ClientError:
                    pass

                # Policy
                policy = None
                try:
                    pol_response = s3.get_bucket_policy(Bucket=bucket_name)
                    policy_str = pol_response.get("Policy", "")
                    policy = json.loads(policy_str) if policy_str else None
                    if policy:
                        for stmt in policy.get("Statement", []):
                            principal = stmt.get("Principal", "")
                            if principal == "*" and stmt.get("Effect") == "Allow":
                                is_public = True
                                break
                except ClientError as e:
                    if e.response["Error"]["Code"] != "NoSuchBucketPolicy":
                        self.logger.warning("S3 policy error", bucket=bucket_name, error=str(e))

                # Encryption
                has_encryption = False
                try:
                    enc = s3.get_bucket_encryption(Bucket=bucket_name)
                    rules = enc.get("ServerSideEncryptionConfiguration", {}).get("Rules", [])
                    has_encryption = len(rules) > 0
                except ClientError as e:
                    if e.response["Error"]["Code"] not in (
                        "ServerSideEncryptionConfigurationNotFoundError",
                        "NoSuchBucketEncryption",
                    ):
                        self.logger.warning("S3 encryption error", bucket=bucket_name, error=str(e))

                # Versioning
                versioning_enabled = False
                try:
                    ver = s3.get_bucket_versioning(Bucket=bucket_name)
                    versioning_enabled = ver.get("Status") == "Enabled"
                except ClientError:
                    pass

                resources.append({
                    "resource_id": arn,
                    "type": "S3_BUCKET",
                    "name": bucket_name,
                    "account_id": self.account_id,
                    "region": bucket_region,
                    "tags": {},
                    "metadata": {
                        "region": bucket_region,
                        "is_public": is_public,
                        "has_encryption": has_encryption,
                        "versioning_enabled": versioning_enabled,
                        "policy": policy,
                    },
                    "raw": bucket,
                })

        except ClientError as e:
            self.logger.warning("S3 collection error", error=str(e))

        return resources
