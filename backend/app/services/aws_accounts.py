import configparser
import os
import time
from typing import Any

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from app.core.logging import get_logger

logger = get_logger(__name__)
_ACCOUNT_NAME_CACHE_TTL_SECONDS = 300
_account_name_cache: dict[str, str] = {}
_account_name_cache_expires_at = 0.0


def get_local_profiles() -> list[str]:
    """Read available profiles from ~/.aws/credentials and ~/.aws/config."""
    profiles = set()

    credentials_path = os.path.expanduser("~/.aws/credentials")
    config_path = os.path.expanduser("~/.aws/config")

    if os.path.exists(credentials_path):
        parser = configparser.ConfigParser()
        parser.read(credentials_path)
        for section in parser.sections():
            profiles.add(section)

    if os.path.exists(config_path):
        parser = configparser.ConfigParser()
        parser.read(config_path)
        for section in parser.sections():
            name = section.replace("profile ", "").strip()
            if name != "default":
                profiles.add(name)
            else:
                profiles.add("default")

    if not profiles:
        profiles.add("default")

    return sorted(profiles)


def resolve_account(profile: str) -> dict[str, Any] | None:
    try:
        session = boto3.Session(profile_name=profile)
        sts = session.client("sts", region_name="us-east-1")
        identity = sts.get_caller_identity()
        account_id = identity["Account"]

        iam = session.client("iam", region_name="us-east-1")
        try:
            aliases = iam.list_account_aliases()["AccountAliases"]
            alias = aliases[0] if aliases else None
        except Exception:
            alias = None

        label = f"{alias} ({account_id})" if alias else account_id

        return {
            "profile": profile,
            "account_id": account_id,
            "alias": alias,
            "label": label,
        }
    except (NoCredentialsError, ClientError) as e:
        logger.warning("Could not resolve account for profile", profile=profile, error=str(e))
        return None


def list_resolvable_accounts() -> list[dict[str, Any]]:
    accounts = []
    for profile in get_local_profiles():
        result = resolve_account(profile)
        if result:
            accounts.append(result)
    return accounts


def list_organization_accounts(profile: str) -> dict[str, Any]:
    session = boto3.Session(profile_name=profile)
    organizations = session.client("organizations", region_name="us-east-1")

    organization = organizations.describe_organization().get("Organization", {})
    management_account_id = (
        organization.get("ManagementAccountId") or organization.get("MasterAccountId")
    )

    paginator = organizations.get_paginator("list_accounts")
    accounts: list[dict[str, Any]] = []

    for page in paginator.paginate():
        for account in page.get("Accounts", []):
            account_state = account.get("State") or account.get("Status")
            if account_state != "ACTIVE":
                continue

            account_id = account["Id"]
            name = account.get("Name") or account_id
            email = account.get("Email")

            accounts.append(
                {
                    "account_id": account_id,
                    "name": name,
                    "email": email,
                    "status": account_state,
                    "label": f"{name} ({account_id})",
                    "is_management": account_id == management_account_id,
                }
            )

    accounts.sort(key=lambda account: (account["name"].lower(), account["account_id"]))

    return {
        "management_account_id": management_account_id,
        "accounts": accounts,
    }


def get_known_account_names(force_refresh: bool = False) -> dict[str, str]:
    global _account_name_cache, _account_name_cache_expires_at

    if (
        not force_refresh
        and _account_name_cache
        and _account_name_cache_expires_at > time.monotonic()
    ):
        return dict(_account_name_cache)

    profiles = get_local_profiles()
    account_names: dict[str, str] = {}

    for profile in profiles:
        account = resolve_account(profile)
        if not account:
            continue

        name = account.get("alias") or account.get("profile")
        account_id = account["account_id"]
        if name and name != account_id:
            account_names[account_id] = name

    for profile in profiles:
        try:
            organization = list_organization_accounts(profile)
        except Exception:
            continue

        for account in organization["accounts"]:
            account_id = account["account_id"]
            name = account.get("name")
            if name and name != account_id:
                account_names[account_id] = name

    _account_name_cache = account_names
    _account_name_cache_expires_at = time.monotonic() + _ACCOUNT_NAME_CACHE_TTL_SECONDS
    return dict(_account_name_cache)
