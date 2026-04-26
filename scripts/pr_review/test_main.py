import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


MODULE_PATH = Path(__file__).with_name("__main__.py")
SPEC = importlib.util.spec_from_file_location("pr_review_main", MODULE_PATH)
assert SPEC and SPEC.loader
PR_REVIEW = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = PR_REVIEW
SPEC.loader.exec_module(PR_REVIEW)


class FormatErrorTests(unittest.TestCase):
    def test_redacts_called_process_error_stderr(self) -> None:
        google_api_key = "AIza" + ("A" * 35)
        exc = subprocess.CalledProcessError(
            1,
            ["gh", "api"],
            stderr=f"Authorization: Bearer secret-token eyJabc.def-ghi.jkl_mno {google_api_key}",
        )

        formatted = PR_REVIEW.format_error(exc)

        self.assertIn("CalledProcessError:", formatted)
        self.assertIn("Authorization: Bearer [REDACTED]", formatted)
        self.assertIn("[REDACTED_JWT]", formatted)
        self.assertIn("[REDACTED_GOOGLE_API_KEY]", formatted)
        self.assertNotIn("secret-token", formatted)
        self.assertNotIn("eyJabc.def-ghi.jkl_mno", formatted)

    def test_truncates_long_errors(self) -> None:
        formatted = PR_REVIEW.format_error(RuntimeError("x" * 2000))

        self.assertLessEqual(len(formatted), PR_REVIEW.MAX_ERROR_CHARS)
        self.assertTrue(formatted.endswith("..."))


class AgentPromptTests(unittest.TestCase):
    def test_load_agent_prompt_appends_accuracy_contract(self) -> None:
        prompt = PR_REVIEW.load_agent_system_prompt("code-reviewer")

        self.assertIn("Produce an unsparing", prompt)
        self.assertIn("## Review accuracy contract", prompt)
        self.assertIn("If the code is correct", prompt)
        self.assertIn("A trailing comment such as `# v4.9.0`", prompt)
        self.assertIn("Do not ask authors to add comments inside JSON files", prompt)
        self.assertIn("Treat newly added files in the cumulative PR diff", prompt)
        self.assertIn("published `.d.ts` files import the package", prompt)
        self.assertIn("inspect author filters", prompt)
        self.assertIn("inspect `src/index.ts` public exports", prompt)
        self.assertIn("tag exists and points at the pinned SHA", prompt)
        self.assertIn("`^0.1.0` is capped", prompt)


class CommentLookupTests(unittest.TestCase):
    @patch.object(PR_REVIEW.subprocess, "check_output")
    def test_find_prior_review_comments_sorts_and_deduplicates(self, check_output) -> None:
        check_output.return_value = "42\n7\n42\n19\n"

        with patch.dict(PR_REVIEW.os.environ, {"GITHUB_REPOSITORY": "amigo-ai/example"}, clear=False):
            comment_ids = PR_REVIEW.find_prior_review_comments("29")

        self.assertEqual(comment_ids, ["7", "19", "42"])


class CommentUpsertTests(unittest.TestCase):
    @patch.object(PR_REVIEW, "delete_comment")
    @patch.object(PR_REVIEW, "update_comment")
    @patch.object(PR_REVIEW, "find_prior_review_comments")
    def test_upsert_keeps_existing_comment_until_update_succeeds(
        self,
        find_prior_review_comments,
        update_comment,
        delete_comment,
    ) -> None:
        find_prior_review_comments.return_value = ["11", "22"]
        update_comment.side_effect = RuntimeError("boom")

        with self.assertRaises(RuntimeError):
            PR_REVIEW.upsert_review_comment("29", "body")

        delete_comment.assert_not_called()

    @patch.object(PR_REVIEW, "delete_comment")
    @patch.object(PR_REVIEW, "update_comment")
    @patch.object(PR_REVIEW, "find_prior_review_comments")
    def test_upsert_deletes_only_stale_comments_after_success(
        self,
        find_prior_review_comments,
        update_comment,
        delete_comment,
    ) -> None:
        find_prior_review_comments.return_value = ["11", "22", "33"]
        update_comment.return_value = "33"

        PR_REVIEW.upsert_review_comment("29", "body")

        update_comment.assert_called_once_with("33", "body")
        delete_comment.assert_any_call("11")
        delete_comment.assert_any_call("22")
        self.assertEqual(delete_comment.call_count, 2)


class FailureReportTests(unittest.TestCase):
    def test_compose_orchestrator_failure_report_summarizes_specialist_state(self) -> None:
        report = PR_REVIEW.compose_orchestrator_failure_report(
            RuntimeError("boom"),
            {
                "ci-reviewer": "review text",
                "security-reviewer": "⚠️ Specialist failed: `RuntimeError`",
            },
        )

        self.assertIn("`ci-reviewer`", report)
        self.assertIn("`security-reviewer`", report)
        self.assertIn("human follow-up is required", report)


if __name__ == "__main__":
    unittest.main()
