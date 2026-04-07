import asyncio
from collections.abc import Iterable, Mapping

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.scan import Scan
from app.schemas.scan import ScanResponse
from app.services.aws_accounts import get_known_account_names


def normalize_account_name(account_id: str, account_name: str | None) -> str | None:
    normalized_name = (account_name or "").strip()
    if not normalized_name or normalized_name == account_id:
        return None
    return normalized_name


def resolve_scan_account_name(
    account_id: str,
    stored_account_name: str | None,
    inferred_account_name: str | None = None,
) -> str | None:
    return normalize_account_name(account_id, stored_account_name) or normalize_account_name(
        account_id,
        inferred_account_name,
    )


def build_scan_response(
    scan: Scan,
    inferred_account_name: str | None = None,
) -> ScanResponse:
    return ScanResponse(
        id=scan.id,
        status=scan.status,
        account_id=scan.account_id,
        account_name=resolve_scan_account_name(
            scan.account_id,
            scan.account_name,
            inferred_account_name,
        ),
        region=scan.region,
        started_at=scan.started_at,
        finished_at=scan.finished_at,
        summary=scan.summary,
        error=scan.error,
    )


async def build_scan_account_name_map(
    db: AsyncSession,
    account_ids: Iterable[str],
) -> dict[str, str]:
    unresolved_account_ids = {account_id for account_id in account_ids if account_id}
    if not unresolved_account_ids:
        return {}

    result = await db.execute(
        select(Scan.account_id, Scan.account_name)
        .where(Scan.account_id.in_(unresolved_account_ids))
        .order_by(Scan.started_at.desc())
    )

    resolved_names: dict[str, str] = {}
    for account_id, account_name in result.all():
        normalized_name = normalize_account_name(account_id, account_name)
        if normalized_name and account_id not in resolved_names:
            resolved_names[account_id] = normalized_name

    remaining_account_ids = unresolved_account_ids - set(resolved_names)
    if not remaining_account_ids:
        return resolved_names

    try:
        known_account_names = await asyncio.to_thread(get_known_account_names)
    except Exception:
        return resolved_names

    for account_id in remaining_account_ids:
        normalized_name = normalize_account_name(account_id, known_account_names.get(account_id))
        if normalized_name:
            resolved_names[account_id] = normalized_name

    return resolved_names


async def backfill_scan_account_names(
    db: AsyncSession,
    account_names: Mapping[str, str | None],
) -> None:
    normalized_account_names = {
        account_id: normalized_name
        for account_id, account_name in account_names.items()
        if (normalized_name := normalize_account_name(account_id, account_name))
    }
    if not normalized_account_names:
        return

    result = await db.execute(
        select(Scan).where(
            Scan.account_id.in_(normalized_account_names),
            or_(
                Scan.account_name.is_(None),
                Scan.account_name == "",
                Scan.account_name == Scan.account_id,
            ),
        )
    )

    for scan in result.scalars():
        scan.account_name = normalized_account_names[scan.account_id]
