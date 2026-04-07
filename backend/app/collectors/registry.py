from typing import Any
import boto3
from app.collectors.ec2 import EC2Collector
from app.collectors.vpc import VPCCollector
from app.collectors.security_groups import SGCollector
from app.collectors.iam import IAMCollector
from app.collectors.s3 import S3Collector
from app.collectors.lambda_ import LambdaCollector
from app.core.logging import get_logger

logger = get_logger(__name__)

COLLECTOR_REGISTRY = {
    "ec2": EC2Collector,
    "vpc": VPCCollector,
    "security_groups": SGCollector,
    "iam": IAMCollector,
    "s3": S3Collector,
    "lambda": LambdaCollector,
}


def collect_all(session: boto3.Session, region: str) -> dict[str, list[dict[str, Any]]]:
    results: dict[str, list[dict[str, Any]]] = {}

    for service, collector_cls in COLLECTOR_REGISTRY.items():
        try:
            logger.info("Running collector", service=service, region=region)
            collector = collector_cls(session, region)
            data = collector.collect()
            results[service] = data
            logger.info("Collector finished", service=service, count=len(data))
        except Exception as e:
            logger.warning("Collector failed", service=service, error=str(e))
            results[service] = []

    return results
