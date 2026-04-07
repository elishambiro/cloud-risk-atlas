from fastapi import HTTPException


def select_organization_accounts(
    organization_accounts: list[dict],
    requested_account_ids: list[str] | None,
) -> list[dict]:
    available_accounts = {
        account["account_id"]: account for account in organization_accounts
    }

    if requested_account_ids is None:
        return list(available_accounts.values())

    deduped_account_ids = list(dict.fromkeys(requested_account_ids))
    if not deduped_account_ids:
        raise HTTPException(status_code=400, detail="Select at least one organization account")

    unknown_account_ids = [
        account_id for account_id in deduped_account_ids if account_id not in available_accounts
    ]
    if unknown_account_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown organization account IDs: {', '.join(unknown_account_ids)}",
        )

    return [available_accounts[account_id] for account_id in deduped_account_ids]


def build_member_role_arn(
    account_id: str,
    source_account_id: str,
    role_name: str,
) -> str | None:
    if account_id == source_account_id:
        return None
    return f"arn:aws:iam::{account_id}:role/{role_name}"
