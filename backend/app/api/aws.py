from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.core.logging import get_logger
from app.services.aws_accounts import list_organization_accounts, list_resolvable_accounts

router = APIRouter(prefix="/api/v1/aws", tags=["aws"])
logger = get_logger(__name__)


@router.get("/accounts")
async def list_accounts() -> list[dict]:
    """Return all AWS accounts resolvable from local credentials."""
    return list_resolvable_accounts()


@router.get("/organization-accounts")
async def get_organization_accounts(
    profile: str = Query(..., description="Management or delegated admin profile"),
) -> dict:
    try:
        result = list_organization_accounts(profile)
        result["default_role_name"] = settings.AWS_ORG_MEMBER_ROLE_NAME
        return result
    except Exception as e:
        logger.warning("Could not list organization accounts", profile=profile, error=str(e))
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not list organization accounts. Use a profile with "
                "organizations:ListAccounts access."
            ),
        ) from e
