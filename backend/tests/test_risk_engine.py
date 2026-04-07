import unittest

import networkx as nx

from app.services.risk_engine import RiskEngine


class _FakeRule:
    def __init__(self, rule_id: str, score: float):
        self.rule_id = rule_id
        self.score = score

    def evaluate(self, resource_id, resource_data, graph):
        return {
            "rule_id": self.rule_id,
            "title": self.rule_id,
            "severity": "medium",
            "score": self.score,
            "explanation": "test",
            "impact": "test",
            "remediation": "test",
            "metadata": {},
        }


class _FakeRegistry:
    def get_rules_for_type(self, resource_type: str):
        if resource_type == "EC2_INSTANCE":
            return [_FakeRule("RULE_A", 70.0), _FakeRule("RULE_B", 40.0)]
        return []


class RiskEngineTests(unittest.TestCase):
    def test_analyze_aggregates_scores_and_sets_severity(self) -> None:
        graph = nx.DiGraph()
        graph.add_node(
            "i-1234567890",
            type="EC2_INSTANCE",
            name="web-1",
            metadata={},
        )

        engine = RiskEngine()
        engine.registry = _FakeRegistry()

        findings = engine.analyze(graph)

        self.assertEqual(len(findings), 2)
        self.assertEqual(graph.nodes["i-1234567890"]["risk_score"], 74.0)
        self.assertEqual(graph.nodes["i-1234567890"]["severity"], "high")


if __name__ == "__main__":
    unittest.main()
