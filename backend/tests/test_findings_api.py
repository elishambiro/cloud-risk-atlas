import unittest
import uuid

from app.api.findings import _build_finding_response, _finding_filters


class FindingFiltersTests(unittest.TestCase):
    def test_builds_scan_only_filters_when_optional_values_are_missing(self) -> None:
        filters = _finding_filters(uuid.uuid4(), None, None)

        self.assertEqual(len(filters), 1)

    def test_includes_severity_and_resource_filters(self) -> None:
        scan_id = uuid.uuid4()
        filters = _finding_filters(scan_id, "high", "arn:aws:s3:::bucket")

        rendered_filters = [str(filter_clause) for filter_clause in filters]

        self.assertEqual(len(filters), 3)
        self.assertTrue(any("findings.severity" in clause for clause in rendered_filters))
        self.assertTrue(any("findings.resource_id" in clause for clause in rendered_filters))


class BuildFindingResponseTests(unittest.TestCase):
    def test_maps_resource_context_fields(self) -> None:
        finding_id = uuid.uuid4()
        scan_id = uuid.uuid4()

        response = _build_finding_response(
            (
                finding_id,
                scan_id,
                "arn:aws:s3:::prod-bucket",
                "S3_PUBLIC_ACL",
                "S3 Bucket is Publicly Accessible",
                "critical",
                90.0,
                "explanation",
                "impact",
                "remediation",
                {"is_public": True},
                "prod-bucket",
                "S3_BUCKET",
            )
        )

        self.assertEqual(response.id, finding_id)
        self.assertEqual(response.scan_id, scan_id)
        self.assertEqual(response.resource_id, "arn:aws:s3:::prod-bucket")
        self.assertEqual(response.resource_name, "prod-bucket")
        self.assertEqual(response.resource_type, "S3_BUCKET")
        self.assertEqual(response.metadata, {"is_public": True})


if __name__ == "__main__":
    unittest.main()
