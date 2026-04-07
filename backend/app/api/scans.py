import asyncio
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.db.session import get_db, AsyncSessionLocal
from app.models.scan import Scan
from app.schemas.scan import (
    ScanResponse,
    TriggerOrganizationScanRequest,
    TriggerOrganizationScanResponse,
    TriggerScanRequest,
    TriggerScanResponse,
)
from app.services.scan_orchestrator import ScanOrchestrator
from app.services.aws_accounts import list_organization_accounts, resolve_account
from app.services.organization_scan import build_member_role_arn, select_organization_accounts
from app.services.scan_account_names import (
    backfill_scan_account_names,
    build_scan_account_name_map,
    build_scan_response,
    normalize_account_name,
)
from app.core.logging import get_logger

router = APIRouter(prefix="/api/v1/scans", tags=["scans"])
logger = get_logger(__name__)


@dataclass(slots=True)
class ScanTarget:
    scan_id: uuid.UUID
    account_id: str
    region: str
    profile: str | None
    role_arn: str | None


async def _run_scan_background(
    scan_id: uuid.UUID,
    account_id: str,
    region: str,
    profile: str | None,
    role_arn: str | None,
) -> None:
    async with AsyncSessionLocal() as db:
        try:
            orchestrator = ScanOrchestrator()
            await orchestrator.run(
                scan_id=scan_id,
                account_id=account_id,
                region=region,
                db=db,
                profile=profile,
                role_arn=role_arn,
            )
        except Exception as e:
            logger.error("Background scan failed", scan_id=str(scan_id), error=str(e))


async def _run_scan_targets_background(targets: list[ScanTarget]) -> None:
    semaphore = asyncio.Semaphore(settings.ORG_SCAN_CONCURRENCY)

    async def run_target(target: ScanTarget) -> None:
        async with semaphore:
            await _run_scan_background(
                scan_id=target.scan_id,
                account_id=target.account_id,
                region=target.region,
                profile=target.profile,
                role_arn=target.role_arn,
            )

    await asyncio.gather(*(run_target(target) for target in targets), return_exceptions=True)


def _build_scan_record(
    scan_id: uuid.UUID,
    account_id: str,
    region: str,
    account_name: str | None = None,
) -> Scan:
    return Scan(
        id=scan_id,
        status="pending",
        account_id=account_id,
        account_name=account_name,
        region=region,
        started_at=datetime.utcnow(),
    )


def _resolve_single_scan_account_name(request: TriggerScanRequest) -> str | None:
    if request.account_name:
        return request.account_name

    if not request.profile:
        return None

    account = resolve_account(request.profile)
    if not account or account["account_id"] != request.account_id:
        return None

    return account.get("alias") or request.profile


@router.post("/trigger", response_model=TriggerScanResponse, status_code=202)
async def trigger_scan(
    request: TriggerScanRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TriggerScanResponse:
    scan_id = uuid.uuid4()
    account_name = _resolve_single_scan_account_name(request)
    await backfill_scan_account_names(db, {request.account_id: account_name})
    scan = _build_scan_record(
        scan_id=scan_id,
        account_id=request.account_id,
        region=request.region,
        account_name=account_name,
    )
    db.add(scan)
    await db.commit()  # must commit before background task reads this scan_id

    background_tasks.add_task(
        _run_scan_background,
        scan_id=scan_id,
        account_id=request.account_id,
        region=request.region,
        profile=request.profile,
        role_arn=request.role_arn,
    )

    return TriggerScanResponse(
        scan_id=scan_id,
        status="pending",
        message=f"Scan {scan_id} started for account {request.account_id} in {request.region}",
    )


@router.post(
    "/trigger-organization",
    response_model=TriggerOrganizationScanResponse,
    status_code=202,
)
async def trigger_organization_scan(
    request: TriggerOrganizationScanRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TriggerOrganizationScanResponse:
    source_account = resolve_account(request.profile)
    if not source_account:
        raise HTTPException(
            status_code=400,
            detail=f"Could not resolve AWS account for profile {request.profile}",
        )

    try:
        organization = list_organization_accounts(request.profile)
    except Exception as e:
        logger.warning(
            "Failed to resolve organization accounts for scan",
            profile=request.profile,
            error=str(e),
        )
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not list organization accounts. Use a management or delegated admin "
                "profile with organizations access."
            ),
        ) from e

    source_account_id = source_account["account_id"]
    selected_accounts = select_organization_accounts(
        organization_accounts=organization["accounts"],
        requested_account_ids=request.account_ids,
    )

    targets: list[ScanTarget] = []
    account_names_for_backfill = {
        account["account_id"]: account.get("name") for account in selected_accounts
    }
    await backfill_scan_account_names(db, account_names_for_backfill)

    for account in selected_accounts:
        scan_id = uuid.uuid4()
        account_id = account["account_id"]
        role_arn = build_member_role_arn(
            account_id=account_id,
            source_account_id=source_account_id,
            role_name=request.role_name,
        )

        db.add(
            _build_scan_record(
                scan_id=scan_id,
                account_id=account_id,
                region=request.region,
                account_name=account.get("name"),
            )
        )
        targets.append(
            ScanTarget(
                scan_id=scan_id,
                account_id=account_id,
                region=request.region,
                profile=request.profile,
                role_arn=role_arn,
            )
        )

    if not targets:
        raise HTTPException(status_code=400, detail="No organization accounts selected")

    await db.commit()
    background_tasks.add_task(_run_scan_targets_background, targets)

    return TriggerOrganizationScanResponse(
        scan_ids=[target.scan_id for target in targets],
        status="pending",
        total_started=len(targets),
        message=(
            f"Started {len(targets)} organization scans in {request.region} using role "
            f"{request.role_name}"
        ),
    )


@router.get("/", response_model=list[ScanResponse])
async def list_scans(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[ScanResponse]:
    result = await db.execute(
        select(Scan).order_by(Scan.started_at.desc()).limit(limit).offset(offset)
    )
    scans = result.scalars().all()
    missing_account_ids = {
        scan.account_id
        for scan in scans
        if not normalize_account_name(scan.account_id, scan.account_name)
    }
    inferred_account_names = await build_scan_account_name_map(db, missing_account_ids)
    return [
        build_scan_response(scan, inferred_account_names.get(scan.account_id))
        for scan in scans
    ]


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(
    scan_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ScanResponse:
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")

    inferred_account_name = None
    if not normalize_account_name(scan.account_id, scan.account_name):
        inferred_account_names = await build_scan_account_name_map(db, {scan.account_id})
        inferred_account_name = inferred_account_names.get(scan.account_id)

    return build_scan_response(scan, inferred_account_name)


@router.delete("/{scan_id}", status_code=204)
async def delete_scan(
    scan_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")
    await db.delete(scan)
    await db.commit()
