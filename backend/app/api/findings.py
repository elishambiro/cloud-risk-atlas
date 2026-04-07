import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, func, select

from app.db.session import get_db
from app.models.scan import Scan
from app.models.finding import Finding
from app.models.resource import Resource
from app.schemas.finding import FindingDetail, FindingResponse, FindingsPage

router = APIRouter(prefix="/api/v1/scans/{scan_id}/findings", tags=["findings"])


def _finding_filters(
    scan_id: uuid.UUID,
    severity: str | None,
    resource_id: str | None,
) -> list:
    filters = [Finding.scan_id == scan_id]
    if severity:
        filters.append(Finding.severity == severity.lower())
    if resource_id:
        filters.append(Finding.resource_id == resource_id)
    return filters


def _build_finding_response(row: tuple) -> FindingResponse:
    (
        finding_id,
        finding_scan_id,
        resource_id,
        rule_id,
        title,
        finding_severity,
        score,
        explanation,
        impact,
        remediation,
        metadata,
        resource_name,
        resource_type,
    ) = row

    return FindingResponse(
        id=finding_id,
        scan_id=finding_scan_id,
        resource_id=resource_id,
        resource_name=resource_name,
        resource_type=resource_type,
        rule_id=rule_id,
        title=title,
        severity=finding_severity,
        score=score,
        explanation=explanation,
        impact=impact,
        remediation=remediation,
        metadata=metadata,
    )


@router.get("/", response_model=FindingsPage)
async def list_findings(
    scan_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    severity: str | None = Query(None, description="Filter by severity"),
    resource_id: str | None = Query(None, description="Filter by resource ID"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> FindingsPage:
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")

    filters = _finding_filters(scan_id, severity, resource_id)
    total_result = await db.execute(select(func.count(Finding.id)).where(*filters))
    total = int(total_result.scalar() or 0)

    resource_join = and_(
        Resource.scan_id == Finding.scan_id,
        Resource.resource_id == Finding.resource_id,
    )
    data_result = await db.execute(
        select(
            Finding.id,
            Finding.scan_id,
            Finding.resource_id,
            Finding.rule_id,
            Finding.title,
            Finding.severity,
            Finding.score,
            Finding.explanation,
            Finding.impact,
            Finding.remediation,
            Finding.metadata_,
            Resource.name,
            Resource.type,
        )
        .outerjoin(Resource, resource_join)
        .where(*filters)
        .order_by(Finding.score.desc(), Finding.id)
        .limit(limit)
        .offset(offset)
    )
    items = [_build_finding_response(row) for row in data_result.all()]

    return FindingsPage(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        has_more=offset + len(items) < total,
    )


@router.get("/{finding_id}", response_model=FindingDetail)
async def get_finding(
    scan_id: uuid.UUID,
    finding_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FindingDetail:
    result = await db.execute(
        select(
            Finding.id,
            Finding.scan_id,
            Finding.resource_id,
            Finding.rule_id,
            Finding.title,
            Finding.severity,
            Finding.score,
            Finding.explanation,
            Finding.impact,
            Finding.remediation,
            Finding.metadata_,
            Resource.name,
            Resource.type,
        )
        .outerjoin(
            Resource,
            and_(
                Resource.scan_id == Finding.scan_id,
                Resource.resource_id == Finding.resource_id,
            ),
        )
        .where(Finding.id == finding_id, Finding.scan_id == scan_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail=f"Finding {finding_id} not found")

    return FindingDetail.model_validate(_build_finding_response(row))
