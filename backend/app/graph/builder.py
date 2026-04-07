import networkx as nx
from app.normalizer.normalizer import NormalizedResource, NormalizedEdge


class GraphBuilder:
    def build(
        self,
        resources: list[NormalizedResource],
        edges: list[NormalizedEdge],
    ) -> nx.DiGraph:
        graph = nx.DiGraph()

        for resource in resources:
            graph.add_node(
                resource.resource_id,
                type=resource.type,
                name=resource.name,
                account_id=resource.account_id,
                region=resource.region,
                tags=resource.tags,
                metadata=resource.metadata,
                raw=resource.raw,
                is_internet_reachable=resource.is_internet_reachable,
                risk_score=resource.risk_score,
                severity=resource.severity,
            )

        for edge in edges:
            if graph.has_node(edge.source_id) and graph.has_node(edge.target_id):
                graph.add_edge(
                    edge.source_id,
                    edge.target_id,
                    relation_type=edge.relation_type,
                    **edge.metadata,
                )

        return graph
