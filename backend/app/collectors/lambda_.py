import json
from typing import Any
import boto3
from botocore.exceptions import ClientError
from app.collectors.base import BaseCollector


class LambdaCollector(BaseCollector):
    def __init__(self, session: boto3.Session, region: str):
        super().__init__(session, region)
        self.account_id = ""

    def collect(self) -> list[dict[str, Any]]:
        resources = []

        try:
            lmb = self.session.client("lambda", region_name=self.region)
            sts = self.session.client("sts")
            try:
                self.account_id = sts.get_caller_identity()["Account"]
            except ClientError:
                self.account_id = "unknown"

            functions = self._paginate(lmb, "list_functions", "Functions")
            for fn in functions:
                fn_name = fn["FunctionName"]
                fn_arn = fn["FunctionArn"]

                # Resource policy
                has_resource_policy = False
                resource_policy = None
                try:
                    pol_response = lmb.get_policy(FunctionName=fn_name)
                    policy_str = pol_response.get("Policy", "")
                    resource_policy = json.loads(policy_str) if policy_str else None
                    has_resource_policy = resource_policy is not None
                except ClientError as e:
                    if e.response["Error"]["Code"] not in ("ResourceNotFoundException",):
                        self.logger.warning("Lambda policy error", function=fn_name, error=str(e))

                vpc_config = fn.get("VpcConfig", {})
                resources.append({
                    "resource_id": fn_arn,
                    "type": "LAMBDA_FUNCTION",
                    "name": fn_name,
                    "account_id": self.account_id,
                    "region": self.region,
                    "tags": fn.get("Tags", {}),
                    "metadata": {
                        "runtime": fn.get("Runtime"),
                        "handler": fn.get("Handler"),
                        "role_arn": fn.get("Role"),
                        "vpc_config": vpc_config,
                        "has_resource_policy": has_resource_policy,
                        "resource_policy": resource_policy,
                        "memory": fn.get("MemorySize"),
                        "timeout": fn.get("Timeout"),
                    },
                    "raw": fn,
                })

        except ClientError as e:
            self.logger.warning("Lambda collection error", error=str(e))

        return resources
