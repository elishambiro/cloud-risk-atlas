import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.scan import Scan
from app.models.attack_path import AttackPath
from app.schemas.attack_path import AttackPathResponse

router = APIRouter(prefix="/api/v1/scans/{scan_id}/attack-paths", tags=["attack-paths"])


@router.get("/", response_model=list[AttackPathResponse])
async def list_attack_paths(
    scan_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[AttackPathResponse]:
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")

    res = await db.execute(
        select(AttackPath)
        .where(AttackPath.scan_id == scan_id)
        .order_by(AttackPath.score.desc())
    )
    paths = res.scalars().all()

    return [AttackPathResponse.model_validate(p) for p in paths]
