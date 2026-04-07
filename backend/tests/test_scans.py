import unittest

from fastapi import HTTPException

from app.services.organization_scan import build_member_role_arn, select_organization_accounts


class SelectOrganizationAccountsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.accounts = [
            {"account_id": "111111111111", "name": "mgmt"},
            {"account_id": "222222222222", "name": "prod"},
            {"account_id": "333333333333", "name": "dev"},
        ]

    def test_returns_all_accounts_when_no_filter_is_given(self) -> None:
        result = select_organization_accounts(self.accounts, None)

        self.assertEqual(result, self.accounts)

    def test_preserves_requested_order_and_deduplicates(self) -> None:
        result = select_organization_accounts(
            self.accounts,
            ["333333333333", "222222222222", "333333333333"],
        )

        self.assertEqual(
            result,
            [
                {"account_id": "333333333333", "name": "dev"},
                {"account_id": "222222222222", "name": "prod"},
            ],
        )

    def test_raises_for_unknown_account_ids(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            select_organization_accounts(self.accounts, ["999999999999"])

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Unknown organization account IDs", ctx.exception.detail)

    def test_raises_for_empty_selection(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            select_organization_accounts(self.accounts, [])

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, "Select at least one organization account")


class BuildMemberRoleArnTests(unittest.TestCase):
    def test_returns_none_for_source_account(self) -> None:
        result = build_member_role_arn(
            account_id="111111111111",
            source_account_id="111111111111",
            role_name="OrganizationAccountAccessRole",
        )

        self.assertIsNone(result)

    def test_returns_role_arn_for_member_account(self) -> None:
        result = build_member_role_arn(
            account_id="222222222222",
            source_account_id="111111111111",
            role_name="SecurityAuditRole",
        )

        self.assertEqual(result, "arn:aws:iam::222222222222:role/SecurityAuditRole")


if __name__ == "__main__":
    unittest.main()
