import unittest
import uuid
from datetime import datetime, timezone

from app.core.json import to_jsonable


class ToJsonableTests(unittest.TestCase):
    def test_converts_nested_datetime_and_uuid_values(self) -> None:
        now = datetime(2026, 4, 5, 12, 30, tzinfo=timezone.utc)
        identifier = uuid.UUID("12345678-1234-5678-1234-567812345678")

        payload = {
            "timestamp": now,
            "items": [
                {"id": identifier},
                {"created_at": now},
            ],
        }

        result = to_jsonable(payload)

        self.assertEqual(result["timestamp"], now.isoformat())
        self.assertEqual(result["items"][0]["id"], str(identifier))
        self.assertEqual(result["items"][1]["created_at"], now.isoformat())


if __name__ == "__main__":
    unittest.main()
