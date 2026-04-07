from abc import ABC, abstractmethod
from typing import Any
import boto3
from app.core.logging import get_logger


class BaseCollector(ABC):
    def __init__(self, session: boto3.Session, region: str):
        self.session = session
        self.region = region
        self.logger = get_logger(self.__class__.__name__)

    @abstractmethod
    def collect(self) -> list[dict[str, Any]]:
        pass

    def _paginate(self, client: Any, method: str, key: str, **kwargs) -> list[dict[str, Any]]:
        results = []
        paginator = client.get_paginator(method)
        for page in paginator.paginate(**kwargs):
            results.extend(page.get(key, []))
        return results
