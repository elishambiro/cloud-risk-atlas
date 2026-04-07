import uuid
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from app.services.scan_account_names import (
    backfill_scan_account_names,
    build_scan_account_name_map,
    build_scan_response,
    normalize_account_name,
)


class NormalizeAccountNameTests(unittest.TestCase):
    def test_returns_none_for_empty_or_duplicate_values(self) -> None:
        self.assertIsNone(normalize_account_name("111111111111", None))
        self.assertIsNone(normalize_account_name("111111111111", ""))
        self.assertIsNone(normalize_account_name("111111111111", "111111111111"))

    def test_returns_trimmed_name(self) -> None:
        self.assertEqual(
            normalize_account_name("111111111111", "  production  "),
            "production",
        )


class BuildScanResponseTests(unittest.TestCase):
    def test_uses_inferred_name_when_stored_name_is_missing(self) -> None:
        scan = SimpleNamespace(
            id=uuid.uuid4(),
            status="complete",
            account_id="111111111111",
            account_name=None,
            region="eu-central-1",
            started_at=datetime.utcnow(),
            finished_at=None,
            summary=None,
            error=None,
        )

        response = build_scan_response(scan, "production")

        self.assertEqual(response.account_name, "production")


class BuildScanAccountNameMapTests(unittest.IsolatedAsyncioTestCase):
    async def test_prefers_recent_stored_names_and_falls_back_to_known_directory(self) -> None:
        db = AsyncMock()
        result = Mock()
        result.all.return_value = [
            ("111111111111", "prod-main"),
            ("111111111111", "older-name"),
            ("222222222222", None),
        ]
        db.execute.return_value = result

        with patch(
            "app.services.scan_account_names.get_known_account_names",
            return_value={"222222222222": "dev-sandbox"},
        ):
            mapping = await build_scan_account_name_map(
                db,
                ["111111111111", "222222222222"],
            )

        self.assertEqual(
            mapping,
            {
                "111111111111": "prod-main",
                "222222222222": "dev-sandbox",
            },
        )


class BackfillScanAccountNamesTests(unittest.IsolatedAsyncioTestCase):
    async def test_updates_only_missing_or_placeholder_names(self) -> None:
        db = AsyncMock()
        unnamed_scan = SimpleNamespace(account_id="111111111111", account_name=None)
        placeholder_scan = SimpleNamespace(
            account_id="222222222222",
            account_name="222222222222",
        )
        result = Mock()
        result.scalars.return_value = [unnamed_scan, placeholder_scan]
        db.execute.return_value = result

        await backfill_scan_account_names(
            db,
            {
                "111111111111": "production",
                "222222222222": "sandbox",
                "333333333333": None,
            },
        )

        self.assertEqual(unnamed_scan.account_name, "production")
        self.assertEqual(placeholder_scan.account_name, "sandbox")


if __name__ == "__main__":
    unittest.main()
