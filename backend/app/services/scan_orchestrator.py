import asyncio
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.scan import Scan
from app.models.resource import Resource
from app.models.finding import Finding
from app.models.attack_path import AttackPath
from app.models.relationship import ResourceRelationship
from app.collectors.registry import collect_all
from app.normalizer.normalizer import Normalizer
from app.graph.builder import GraphBuilder
from app.services.risk_engine import RiskEngine
from app.services.attack_path import AttackPathAnalyzer
from app.services.aws_client import AWSClientFactory
from app.core.json import to_jsonable
from app.core.logging import get_logger

logger = get_logger(__name__)


class ScanOrchestrator:
    def __init__(self):
        self.normalizer = Normalizer()
        self.graph_builder = GraphBuilder()
        self.risk_engine = RiskEngine()
        self.attack_path_analyzer = AttackPathAnalyzer()

    async def run(
        self,
        scan_id: uuid.UUID,
        account_id: str,
        region: str,
        db: AsyncSession,
        profile: str | None = None,
        role_arn: str | None = None,
    ) -> None:
        logger.info("Starting scan", scan_id=str(scan_id), account_id=account_id, region=region)

        await self._update_scan(db, scan_id, status="running")
        await db.commit()

        try:
            logger.info("Collecting AWS resources", scan_id=str(scan_id))
            session = await asyncio.to_thread(
                AWSClientFactory.create_session,
                profile=profile,
                role_arn=role_arn,
                region=region,
            )
            raw_results = await asyncio.to_thread(collect_all, session, region)

            total_raw = sum(len(v) for v in raw_results.values())
            logger.info("Collection complete", scan_id=str(scan_id), total_items=total_raw)

            logger.info("Normalizing resources", scan_id=str(scan_id))
            resources, edges = await asyncio.to_thread(self.normalizer.normalize, raw_results)
            logger.info(
                "Normalization complete",
                scan_id=str(scan_id),
                resources=len(resources),
                edges=len(edges),
            )

            logger.info("Building graph", scan_id=str(scan_id))
            graph = await asyncio.to_thread(self.graph_builder.build, resources, edges)
            logger.info(
                "Graph built",
                scan_id=str(scan_id),
                nodes=graph.number_of_nodes(),
                edges_count=graph.number_of_edges(),
            )

            logger.info("Running risk analysis", scan_id=str(scan_id))
            findings_data = await asyncio.to_thread(self.risk_engine.analyze, graph)
            logger.info("Risk analysis complete", scan_id=str(scan_id), findings=len(findings_data))

            logger.info("Finding attack paths", scan_id=str(scan_id))
            attack_paths_data = await asyncio.to_thread(
                self.attack_path_analyzer.find_paths,
                graph,
            )
            logger.info(
                "Attack path analysis complete",
                scan_id=str(scan_id),
                paths=len(attack_paths_data),
            )

            logger.info("Persisting resources", scan_id=str(scan_id))
            resource_records = []
            for res in resources:
                record = Resource(
                    id=uuid.uuid4(),
                    scan_id=scan_id,
                    resource_id=res.resource_id,
                    type=res.type,
                    account_id=res.account_id,
                    region=res.region,
                    name=res.name,
                    tags=to_jsonable(res.tags),
                    metadata_=to_jsonable(res.metadata),
                    raw=to_jsonable(res.raw),
                    risk_score=graph.nodes.get(res.resource_id, {}).get("risk_score", 0.0),
                    severity=graph.nodes.get(res.resource_id, {}).get("severity", "none"),
                    is_internet_reachable=graph.nodes.get(res.resource_id, {}).get(
                        "is_internet_reachable", False
                    ),
                )
                resource_records.append(record)
            db.add_all(resource_records)

            edge_records = []
            for edge in edges:
                record = ResourceRelationship(
                    id=uuid.uuid4(),
                    scan_id=scan_id,
                    source_id=edge.source_id,
                    target_id=edge.target_id,
                    relation_type=edge.relation_type,
                    metadata_=to_jsonable(edge.metadata),
                )
                edge_records.append(record)
            db.add_all(edge_records)

            finding_records = []
            for f in findings_data:
                record = Finding(
                    id=uuid.uuid4(),
                    scan_id=scan_id,
                    resource_id=f["resource_id"],
                    rule_id=f["rule_id"],
                    title=f["title"],
                    severity=f["severity"],
                    score=f.get("score", 0.0),
                    explanation=f["explanation"],
                    impact=f["impact"],
                    remediation=f["remediation"],
                    metadata_=to_jsonable(f.get("metadata")),
                )
                finding_records.append(record)
            db.add_all(finding_records)

            path_records = []
            for p in attack_paths_data:
                record = AttackPath(
                    id=uuid.uuid4(),
                    scan_id=scan_id,
                    title=p["title"],
                    path=p["path"],
                    severity=p["severity"],
                    score=p["score"],
                    entry_point=p["entry_point"],
                    target=p["target"],
                    description=p["description"],
                )
                path_records.append(record)
            db.add_all(path_records)

            await db.flush()

            severity_counts: dict[str, int] = {}
            for f in findings_data:
                s = f.get("severity", "none")
                severity_counts[s] = severity_counts.get(s, 0) + 1

            risk_scores = [
                graph.nodes[n].get("risk_score", 0.0)
                for n in graph.nodes
                if graph.nodes[n].get("type") != "INTERNET"
            ]
            global_risk_score = (
                sum(risk_scores) / len(risk_scores) if risk_scores else 0.0
            )

            summary = {
                "total_resources": len([r for r in resources if r.type != "INTERNET"]),
                "total_findings": len(findings_data),
                "total_attack_paths": len(attack_paths_data),
                "global_risk_score": round(global_risk_score, 2),
                "severity_counts": severity_counts,
            }

            await self._update_scan(
                db,
                scan_id,
                status="complete",
                finished_at=datetime.utcnow(),
                summary=to_jsonable(summary),
            )
            await db.commit()

            logger.info("Scan complete", scan_id=str(scan_id), summary=summary)

        except Exception as e:
            await db.rollback()
            logger.error("Scan failed", scan_id=str(scan_id), error=str(e), exc_info=True)
            try:
                await self._update_scan(
                    db,
                    scan_id,
                    status="failed",
                    finished_at=datetime.utcnow(),
                    error=str(e),
                )
                await db.commit()
            except Exception:
                await db.rollback()
                logger.error(
                    "Failed to persist scan failure state",
                    scan_id=str(scan_id),
                    exc_info=True,
                )
            raise

    async def _update_scan(
        self,
        db: AsyncSession,
        scan_id: uuid.UUID,
        status: str,
        finished_at: datetime | None = None,
        summary: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> None:
        result = await db.execute(select(Scan).where(Scan.id == scan_id))
        scan = result.scalar_one_or_none()
        if scan:
            scan.status = status
            if finished_at:
                scan.finished_at = finished_at
            if summary:
                scan.summary = summary
            if error:
                scan.error = error
            await db.flush()
