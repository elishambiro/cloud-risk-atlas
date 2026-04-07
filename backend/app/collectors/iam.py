import json
from typing import Any
import boto3
from botocore.exceptions import ClientError
from app.collectors.base import BaseCollector


def _has_wildcard(document: Any) -> tuple[bool, bool]:
    """Returns (has_wildcard_action, has_wildcard_resource)"""
    has_wc_action = False
    has_wc_resource = False

    if not isinstance(document, dict):
        return False, False

    statements = document.get("Statement", [])
    if isinstance(statements, dict):
        statements = [statements]

    for stmt in statements:
        effect = stmt.get("Effect", "Allow")
        if effect != "Allow":
            continue
        actions = stmt.get("Action", [])
        resources = stmt.get("Resource", [])
        if isinstance(actions, str):
            actions = [actions]
        if isinstance(resources, str):
            resources = [resources]
        if "*" in actions:
            has_wc_action = True
        if "*" in resources:
            has_wc_resource = True

    return has_wc_action, has_wc_resource


# AWS managed policies with admin/wildcard access — no need to fetch
_KNOWN_WILDCARD_POLICIES = {
    "arn:aws:iam::aws:policy/AdministratorAccess",
    "arn:aws:iam::aws:policy/PowerUserAccess",
}


class IAMCollector(BaseCollector):
    def __init__(self, session: boto3.Session, region: str):
        super().__init__(session, region)
        self.account_id = ""
        # Cache: policy_arn -> document (avoids re-fetching shared managed policies)
        self._policy_doc_cache: dict[str, dict] = {}

    def _get_policy_document(self, iam, policy_arn: str) -> dict:
        """Fetch and cache a policy document by ARN."""
        if policy_arn in self._policy_doc_cache:
            return self._policy_doc_cache[policy_arn]

        # Known wildcard policies — don't bother fetching
        if policy_arn in _KNOWN_WILDCARD_POLICIES:
            doc = {"Statement": [{"Effect": "Allow", "Action": "*", "Resource": "*"}]}
            self._policy_doc_cache[policy_arn] = doc
            return doc

        try:
            pol_detail = iam.get_policy(PolicyArn=policy_arn)["Policy"]
            version_id = pol_detail.get("DefaultVersionId", "v1")
            version = iam.get_policy_version(
                PolicyArn=policy_arn, VersionId=version_id
            )["PolicyVersion"]
            doc = version.get("Document", {})
            if isinstance(doc, str):
                doc = json.loads(doc)
        except ClientError:
            doc = {}

        self._policy_doc_cache[policy_arn] = doc
        return doc

    def collect(self) -> list[dict[str, Any]]:
        resources = []

        try:
            iam = self.session.client("iam")
            sts = self.session.client("sts")
            try:
                self.account_id = sts.get_caller_identity()["Account"]
            except ClientError:
                self.account_id = "unknown"

            roles = self._paginate(iam, "list_roles", "Roles")
            for role in roles:
                role_name = role["RoleName"]
                role_arn = role["Arn"]

                attached_policies = []
                has_wc_action = False
                has_wc_resource = False

                try:
                    policy_list = self._paginate(
                        iam, "list_attached_role_policies", "AttachedPolicies",
                        RoleName=role_name
                    )
                    for pol in policy_list:
                        pol_arn = pol["PolicyArn"]
                        doc = self._get_policy_document(iam, pol_arn)

                        wca, wcr = _has_wildcard(doc)
                        if wca:
                            has_wc_action = True
                        if wcr:
                            has_wc_resource = True

                        attached_policies.append({
                            "name": pol["PolicyName"],
                            "arn": pol_arn,
                        })
                except ClientError:
                    pass

                assume_policy = role.get("AssumeRolePolicyDocument", {})
                if isinstance(assume_policy, str):
                    assume_policy = json.loads(assume_policy)

                resources.append({
                    "resource_id": role_arn,
                    "type": "IAM_ROLE",
                    "name": role_name,
                    "account_id": self.account_id,
                    "region": "global",
                    "tags": {t["Key"]: t["Value"] for t in role.get("Tags", [])},
                    "metadata": {
                        "assume_role_policy": assume_policy,
                        "attached_policies": attached_policies,
                        "has_wildcard_action": has_wc_action,
                        "has_wildcard_resource": has_wc_resource,
                        "path": role.get("Path"),
                        "create_date": str(role.get("CreateDate", "")),
                    },
                    "raw": role,
                })

        except ClientError as e:
            self.logger.warning("IAM collection error", error=str(e))

        return resources
