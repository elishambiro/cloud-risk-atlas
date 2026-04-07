from abc import ABC, abstractmethod
from typing import Any
import networkx as nx


class Rule(ABC):
    rule_id: str
    title: str
    severity: str
    resource_types: list[str]

    @abstractmethod
    def evaluate(
        self, resource_id: str, resource_data: dict[str, Any], graph: nx.DiGraph
    ) -> dict[str, Any] | None:
        """
        Returns a finding dict or None if the rule does not fire.
        Finding dict keys: rule_id, title, severity, score, explanation, impact, remediation, metadata
        """
        pass
