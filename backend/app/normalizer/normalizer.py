from dataclasses import dataclass, field
from typing import Any

INTERNET_NODE_ID = "arn:virtual:internet:INTERNET"


@dataclass
class NormalizedResource:
    resource_id: str
    type: str
    name: str | None
    account_id: str
    region: str
    tags: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)
    raw: dict[str, Any] = field(default_factory=dict)
    is_internet_reachable: bool = False
    risk_score: float = 0.0
    severity: str = "none"


@dataclass
class NormalizedEdge:
    source_id: str
    target_id: str
    relation_type: str
    metadata: dict[str, Any] = field(default_factory=dict)


class Normalizer:
    def normalize(
        self, raw_results: dict[str, list[dict[str, Any]]]
    ) -> tuple[list[NormalizedResource], list[NormalizedEdge]]:
        resources: list[NormalizedResource] = []
        edges: list[NormalizedEdge] = []

        # Create virtual INTERNET node
        internet_node = NormalizedResource(
            resource_id=INTERNET_NODE_ID,
            type="INTERNET",
            name="Internet",
            account_id="virtual",
            region="global",
            metadata={"description": "Virtual Internet node representing external traffic"},
            is_internet_reachable=True,
        )
        resources.append(internet_node)

        # Index for lookups
        resource_map: dict[str, NormalizedResource] = {INTERNET_NODE_ID: internet_node}
        # Map: sg_id -> NormalizedResource
        sg_map: dict[str, NormalizedResource] = {}
        # Map: role_arn -> NormalizedResource
        role_map: dict[str, NormalizedResource] = {}
        # Map: resource_id -> NormalizedResource
        all_resources_map: dict[str, NormalizedResource] = {}

        raw_edges: list[NormalizedEdge] = []

        for service, items in raw_results.items():
            for item in items:
                if item.get("type") == "_relationship":
                    raw_edges.append(NormalizedEdge(
                        source_id=item["source_id"],
                        target_id=item["target_id"],
                        relation_type=item["relation_type"],
                        metadata=item.get("metadata", {}),
                    ))
                    continue

                res = NormalizedResource(
                    resource_id=item["resource_id"],
                    type=item.get("type", "UNKNOWN"),
                    name=item.get("name"),
                    account_id=item.get("account_id", "unknown"),
                    region=item.get("region", "unknown"),
                    tags=item.get("tags", {}),
                    metadata=item.get("metadata", {}),
                    raw=item.get("raw", {}),
                    is_internet_reachable=item.get("is_internet_reachable", False),
                )
                resources.append(res)
                resource_map[res.resource_id] = res
                all_resources_map[res.resource_id] = res

                if res.type == "SECURITY_GROUP":
                    sg_map[res.resource_id] = res
                elif res.type == "IAM_ROLE":
                    role_map[res.resource_id] = res

        # Add raw edges (from EC2 → SG, etc.)
        edges.extend(raw_edges)

        # Build derived relationships
        for res in list(resources):
            meta = res.metadata

            if res.type == "EC2_INSTANCE":
                # EC2 → IAM role via instance profile
                profile_arn = meta.get("iam_instance_profile_arn")
                if profile_arn:
                    # Find IAM role associated with profile
                    for role_arn, role_res in role_map.items():
                        # Match by profile ARN containing role name
                        role_name = role_res.name or ""
                        if role_name and role_name in profile_arn:
                            edges.append(NormalizedEdge(
                                source_id=res.resource_id,
                                target_id=role_arn,
                                relation_type="ASSUMES",
                                metadata={"via": "instance_profile"},
                            ))
                            break

                # Check if any attached SG has open inbound -> mark EC2 as internet-reachable
                sg_ids = meta.get("security_group_ids", [])
                for sg_id in sg_ids:
                    # Build possible ARN patterns
                    for sg_arn, sg_res in sg_map.items():
                        if sg_id in sg_arn:
                            if sg_res.metadata.get("has_open_inbound_all"):
                                res.is_internet_reachable = True
                                edges.append(NormalizedEdge(
                                    source_id=INTERNET_NODE_ID,
                                    target_id=res.resource_id,
                                    relation_type="EXPOSES",
                                    metadata={"via_sg": sg_arn},
                                ))

            elif res.type == "LAMBDA_FUNCTION":
                # Lambda → IAM role
                role_arn = meta.get("role_arn")
                if role_arn and role_arn in role_map:
                    edges.append(NormalizedEdge(
                        source_id=res.resource_id,
                        target_id=role_arn,
                        relation_type="ASSUMES",
                        metadata={"via": "execution_role"},
                    ))

            elif res.type == "IAM_ROLE":
                # IAM role with wildcard → S3 grants access
                if meta.get("has_wildcard_action") or meta.get("has_wildcard_resource"):
                    for r_id, r_res in all_resources_map.items():
                        if r_res.type == "S3_BUCKET":
                            edges.append(NormalizedEdge(
                                source_id=res.resource_id,
                                target_id=r_id,
                                relation_type="GRANTS_ACCESS",
                                metadata={"reason": "wildcard_policy"},
                            ))

            elif res.type == "S3_BUCKET":
                if meta.get("is_public"):
                    edges.append(NormalizedEdge(
                        source_id=INTERNET_NODE_ID,
                        target_id=res.resource_id,
                        relation_type="EXPOSES",
                        metadata={"reason": "public_bucket"},
                    ))

        return resources, edges
