from app.rules.base import Rule
from app.rules.sg_open_world import SGOpenInboundAll
from app.rules.s3_public import S3PublicACL
from app.rules.iam_wildcard import IAMWildcardPolicy
from app.rules.ec2_public_ip import EC2PublicIP
from app.rules.s3_no_encryption import S3NoEncryption
from app.rules.lambda_wide_role import LambdaWideRole

ALL_RULES: list[Rule] = [
    SGOpenInboundAll(),
    S3PublicACL(),
    IAMWildcardPolicy(),
    EC2PublicIP(),
    S3NoEncryption(),
    LambdaWideRole(),
]


class RuleRegistry:
    def __init__(self, rules: list[Rule] | None = None):
        self._rules = rules or ALL_RULES

    def get_rules_for_type(self, resource_type: str) -> list[Rule]:
        return [r for r in self._rules if resource_type in r.resource_types]

    def all_rules(self) -> list[Rule]:
        return list(self._rules)
