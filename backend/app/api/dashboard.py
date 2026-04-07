import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.scan import Scan
from app.models.resource import Resource
from app.models.finding import Finding
from app.models.attack_path import AttackPath
from app.schemas.dashboard import DashboardResponse, SeverityCount, TopResource, TopAttackPath
from app.services.scan_account_names import build_scan_account_name_map, normalize_account_name

router = APIRouter(prefix="/api/v1/scans/{scan_id}/dashboard", tags=["dashboard"])


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    scan_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardResponse:
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")

    resource_stats_result = await db.execute(
        select(
            func.count(Resource.id),
            func.avg(Resource.risk_score),
        ).where(Resource.scan_id == scan_id, Resource.type != "INTERNET")
    )
    total_resources, average_resource_risk = resource_stats_result.one()
    total_resources = int(total_resources or 0)
    global_risk_score = round(float(average_resource_risk or 0.0), 2)

    top_resources_result = await db.execute(
        select(
            Resource.resource_id,
            Resource.name,
            Resource.type,
            Resource.risk_score,
            Resource.severity,
            Resource.is_internet_reachable,
        )
        .where(Resource.scan_id == scan_id, Resource.type != "INTERNET")
        .order_by(Resource.risk_score.desc())
        .limit(5)
    )
    findings_result = await db.execute(
        select(Finding.severity, func.count(Finding.id))
        .where(Finding.scan_id == scan_id)
        .group_by(Finding.severity)
    )

    severity_counts = SeverityCount()
    total_findings = 0
    for severity, count in findings_result.all():
        sev = (severity or "none").lower()
        total_findings += count
        if sev == "critical":
            severity_counts.critical += count
        elif sev == "high":
            severity_counts.high += count
        elif sev == "medium":
            severity_counts.medium += count
        elif sev == "low":
            severity_counts.low += count
        else:
            severity_counts.none += count

    top_resources = [
        TopResource(
            resource_id=resource_id,
            name=name,
            type=resource_type,
            risk_score=risk_score,
            severity=severity,
            is_internet_reachable=is_internet_reachable,
        )
        for resource_id, name, resource_type, risk_score, severity, is_internet_reachable in top_resources_result.all()
    ]

    attack_path_stats_result = await db.execute(
        select(func.count(AttackPath.id)).where(AttackPath.scan_id == scan_id)
    )
    total_attack_paths = int(attack_path_stats_result.scalar() or 0)

    paths_result = await db.execute(
        select(
            AttackPath.id,
            AttackPath.title,
            AttackPath.severity,
            AttackPath.score,
            AttackPath.entry_point,
            AttackPath.target,
            AttackPath.description,
        )
        .where(AttackPath.scan_id == scan_id)
        .order_by(AttackPath.score.desc())
        .limit(3)
    )

    top_attack_paths = [
        TopAttackPath(
            id=str(path_id),
            title=title,
            severity=severity,
            score=score,
            entry_point=entry_point,
            target=target,
            description=description,
        )
        for path_id, title, severity, score, entry_point, target, description in paths_result.all()
    ]

    duration = None
    if scan.started_at and scan.finished_at:
        duration = int((scan.finished_at - scan.started_at).total_seconds())

    account_name = scan.account_name
    if not normalize_account_name(scan.account_id, account_name):
        inferred_account_names = await build_scan_account_name_map(db, {scan.account_id})
        account_name = inferred_account_names.get(scan.account_id)

    scan_info = {
        "id": str(scan.id),
        "status": scan.status,
        "account_id": scan.account_id,
        "account_name": account_name,
        "region": scan.region,
        "started_at": scan.started_at.isoformat() if scan.started_at else None,
        "finished_at": scan.finished_at.isoformat() if scan.finished_at else None,
        "duration_seconds": duration,
        "error": scan.error,
    }

    return DashboardResponse(
        global_risk_score=global_risk_score,
        severity_counts=severity_counts,
        top_resources=top_resources,
        top_attack_paths=top_attack_paths,
        total_resources=total_resources,
        total_findings=total_findings,
        total_attack_paths=total_attack_paths,
        scan_info=scan_info,
    )
