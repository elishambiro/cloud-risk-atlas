import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.scan import Scan
from app.models.resource import Resource
from app.models.relationship import ResourceRelationship
from app.schemas.graph import GraphResponse, GraphNode, GraphEdge

router = APIRouter(prefix="/api/v1/scans/{scan_id}/graph", tags=["graph"])


@router.get("/", response_model=GraphResponse)
async def get_graph(
    scan_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GraphResponse:
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")

    res_result = await db.execute(
        select(
            Resource.resource_id,
            Resource.type,
            Resource.name,
            Resource.risk_score,
            Resource.severity,
            Resource.is_internet_reachable,
            Resource.metadata_,
            Resource.account_id,
            Resource.region,
        ).where(Resource.scan_id == scan_id)
    )
    rel_result = await db.execute(
        select(
            ResourceRelationship.id,
            ResourceRelationship.source_id,
            ResourceRelationship.target_id,
            ResourceRelationship.relation_type,
        ).where(ResourceRelationship.scan_id == scan_id)
    )

    nodes = [
        GraphNode(
            id=resource_id,
            type=resource_type,
            name=name,
            risk_score=risk_score,
            severity=severity,
            is_internet_reachable=is_internet_reachable,
            metadata=metadata or {},
            account_id=account_id,
            region=region,
        )
        for (
            resource_id,
            resource_type,
            name,
            risk_score,
            severity,
            is_internet_reachable,
            metadata,
            account_id,
            region,
        ) in res_result.all()
    ]

    edges = [
        GraphEdge(
            id=str(relationship_id),
            source=source_id,
            target=target_id,
            relation_type=relation_type,
        )
        for relationship_id, source_id, target_id, relation_type in rel_result.all()
    ]

    return GraphResponse(
        nodes=nodes,
        edges=edges,
        scan_id=str(scan_id),
    )
