#!/usr/bin/env python3
"""PR reviewer — dispatches SDK specialist review agents in parallel.

Entry point for `.github/workflows/pr-review.yml`. Also runnable locally:

    uv run --python 3.12 --with 'anthropic[vertex]>=0.52.0' \\
        python -m scripts.pr_review --pr 23

The script:
  1. Loads specialist prompts from `.claude/agents/`.
  2. Classifies the PR into SDK, tests, and CI/release buckets.
  3. Runs the matching specialists plus always-on reviewers in parallel.
  4. Consolidates findings into one PR comment and replaces any prior comment
     this script posted.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from anthropic import AsyncAnthropicVertex
from anthropic.types import Message

REPO_ROOT = Path(__file__).resolve().parents[2]
AGENTS_DIR = REPO_ROOT / ".claude" / "agents"

COMMENT_MARKER = "<!-- sdk-review:v1 -->"
SPECIALIST_FAILURE_PREFIX = "⚠️ Specialist failed: "

DEFAULT_SPECIALIST_MODEL = os.environ.get("REVIEW_MODEL", "claude-sonnet-4-6")
DEFAULT_ORCHESTRATOR_MODEL = os.environ.get("REVIEW_ORCHESTRATOR_MODEL", "claude-opus-4-6")
DEFAULT_VERTEX_PROJECT = os.environ.get("VERTEX_PROJECT", "amigo-platform")
DEFAULT_VERTEX_REGION = os.environ.get("VERTEX_REGION", "global")

SPECIALIST_MAX_TOKENS = 4000
ORCHESTRATOR_MAX_TOKENS = 7000
MAX_DIFF_CHARS = 140_000
MAX_ERROR_CHARS = 800
ERROR_REDACTION_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"(?i)(authorization:?\s*bearer\s+)[a-z0-9._~-]+"), r"\1[REDACTED]"),
    (re.compile(r"\bya29\.[A-Za-z0-9._-]+\b"), "[REDACTED_OAUTH_TOKEN]"),
    (re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b"), "[REDACTED_JWT]"),
    (re.compile(r"-----BEGIN[^-]+PRIVATE KEY-----[\s\S]+?-----END[^-]+PRIVATE KEY-----"), "[REDACTED_PRIVATE_KEY]"),
    (re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"), "[REDACTED_GOOGLE_API_KEY]"),
)


@dataclass(frozen=True)
class Bucket:
    name: str
    specialist: str
    prefixes: tuple[str, ...]


BUCKETS: tuple[Bucket, ...] = (
    Bucket(
        "sdk",
        "sdk-reviewer",
        ("src/", "openapi.json", "api.md", "README.md", "package.json", "package-lock.json"),
    ),
    Bucket("tests", "test-reviewer", ("tests/",)),
    Bucket("ci", "ci-reviewer", (".github/workflows/", "scripts/", ".claude/agents/")),
)

ALWAYS_ON = ("principles-reviewer", "security-reviewer")


def classify(changed_files: list[str]) -> tuple[set[Bucket], bool]:
    active: set[Bucket] = set()
    non_docs = False
    for path in changed_files:
        if not path.endswith(".md"):
            non_docs = True
        for bucket in BUCKETS:
            if any(path.startswith(prefix) for prefix in bucket.prefixes):
                active.add(bucket)
    return active, not non_docs


def scope_diff_to_prefixes(diff: str, prefixes: tuple[str, ...]) -> str:
    if not prefixes:
        return diff
    out: list[str] = []
    keep = False
    for line in diff.splitlines(keepends=True):
        if line.startswith("diff --git "):
            try:
                a_path = line.split(" a/", 1)[1].split(" b/", 1)[0]
            except IndexError:
                a_path = ""
            keep = any(a_path.startswith(prefix) for prefix in prefixes)
        if keep:
            out.append(line)
    return "".join(out)


def load_agent_system_prompt(name: str) -> str:
    path = AGENTS_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Agent definition not found: {path}")
    text = path.read_text()
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            return parts[2].strip()
    return text.strip()


def fetch_pr_metadata(pr_number: str) -> dict:
    raw = subprocess.check_output(
        [
            "gh",
            "pr",
            "view",
            pr_number,
            "--json",
            "number,title,body,headRefName,baseRefName,author,additions,deletions,changedFiles,files,isDraft",
        ],
        text=True,
    )
    return json.loads(raw)


def fetch_pr_diff(pr_number: str) -> str:
    return subprocess.check_output(["gh", "pr", "diff", pr_number], text=True)


def changed_file_paths(pr_meta: dict) -> list[str]:
    return [f["path"] for f in pr_meta.get("files", [])]


def format_error(exc: Exception) -> str:
    message = " ".join(f"{type(exc).__name__}: {exc}".split()).replace("`", "'")
    for pattern, replacement in ERROR_REDACTION_PATTERNS:
        message = pattern.sub(replacement, message)
    if len(message) <= MAX_ERROR_CHARS:
        return message
    return message[: MAX_ERROR_CHARS - 3] + "..."


async def run_specialist(
    client: AsyncAnthropicVertex,
    agent_name: str,
    diff: str,
    changed_files: list[str],
    pr_meta: dict,
    model: str,
    max_tokens: int,
) -> tuple[str, str]:
    system = load_agent_system_prompt(agent_name)
    scoped_files_block = (
        "Changed files relevant to this reviewer:\n"
        + "\n".join(f"  - {path}" for path in changed_files)
        if changed_files
        else "No files scoped specifically to this reviewer; use your repository-wide lens on the full diff."
    )
    diff_block = diff if len(diff) <= MAX_DIFF_CHARS else diff[:MAX_DIFF_CHARS] + "\n\n[... diff truncated ...]"
    user = f"""Review the following PR.

**PR #{pr_meta['number']}: {pr_meta['title']}**

Author: {pr_meta['author']['login']}
Branch: {pr_meta['headRefName']} -> {pr_meta['baseRefName']}
Size: +{pr_meta['additions']} / -{pr_meta['deletions']} across {pr_meta['changedFiles']} files

PR body:
{pr_meta.get('body') or '(empty)'}

{scoped_files_block}

---
DIFF:
{diff_block}
"""
    try:
        response: Message = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = "\n".join(
            block.text for block in response.content if getattr(block, "type", None) == "text"
        ).strip()
        return agent_name, text
    except Exception as exc:  # noqa: BLE001
        return agent_name, f"{SPECIALIST_FAILURE_PREFIX}`{format_error(exc)}`"


async def run_orchestrator(
    client: AsyncAnthropicVertex,
    specialist_findings: dict[str, str],
    pr_meta: dict,
    buckets: list[str],
    docs_only: bool,
    model: str,
) -> str:
    system = load_agent_system_prompt("code-reviewer")
    findings_block = "\n\n".join(
        f"## Findings from `{agent}`\n\n{text}"
        for agent, text in specialist_findings.items()
    )
    scope_sprawl = "WARNING" if len(buckets) >= 3 else "OK"
    user = f"""You are consolidating specialist review findings into a single report.

**PR #{pr_meta['number']}: {pr_meta['title']}**
Size: +{pr_meta['additions']} / -{pr_meta['deletions']} across {pr_meta['changedFiles']} files
Buckets: {', '.join(buckets) if buckets else '(docs-only)' if docs_only else '(none detected)'}
Scope sprawl: {scope_sprawl} ({len(buckets)} buckets)

Produce the consolidated report using the exact output contract from your
system prompt. Deduplicate obvious overlaps between specialists. Be unsparing
but accurate: do not invent blockers, and do not soften real ones.

---

{findings_block}
"""
    response: Message = await client.messages.create(
        model=model,
        max_tokens=ORCHESTRATOR_MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    review_text = "\n".join(
        block.text for block in response.content if getattr(block, "type", None) == "text"
    ).strip()
    if not review_text:
        raise RuntimeError("Orchestrator response contained no text blocks")
    return review_text


def find_prior_review_comments(pr_number: str) -> list[str]:
    selector = (
        ".[] | select(.user.login == "
        '"github-actions[bot]"'
        f" and (.body | contains({json.dumps(COMMENT_MARKER)}))) | .id"
    )
    try:
        raw = subprocess.check_output(
            [
                "gh",
                "api",
                f"repos/{os.environ['GITHUB_REPOSITORY']}/issues/{pr_number}/comments",
                "--paginate",
                "--jq",
                selector,
            ],
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        print(f"Failed to fetch prior review comments: {format_error(exc)}", file=sys.stderr)
        return []
    return [line.strip() for line in raw.splitlines() if line.strip().isdigit()]


def delete_comment(comment_id: str) -> None:
    subprocess.run(
        [
            "gh",
            "api",
            "--method",
            "DELETE",
            f"repos/{os.environ['GITHUB_REPOSITORY']}/issues/comments/{comment_id}",
        ],
        check=True,
    )


def post_comment(pr_number: str, body: str) -> None:
    subprocess.run(["gh", "pr", "comment", pr_number, "--body", body], check=True)


def update_comment(comment_id: str, body: str) -> None:
    subprocess.run(
        [
            "gh",
            "api",
            "--method",
            "PATCH",
            f"repos/{os.environ['GITHUB_REPOSITORY']}/issues/comments/{comment_id}",
            "-f",
            f"body={body}",
        ],
        check=True,
    )


def upsert_review_comment(pr_number: str, body: str) -> None:
    comment_ids = find_prior_review_comments(pr_number)
    latest_comment_id = comment_ids[-1] if comment_ids else None

    if latest_comment_id:
        update_comment(latest_comment_id, body)
    else:
        post_comment(pr_number, body)

    for comment_id in comment_ids[:-1]:
        delete_comment(comment_id)


def compose_final_comment(report_markdown: str, buckets: list[str]) -> str:
    header = (
        f"{COMMENT_MARKER}\n"
        "# Claude Code Review\n\n"
        f"Reviewed by specialist agents in `.claude/agents/`. "
        f"Buckets: `{', '.join(buckets) if buckets else '(none)'}`.\n\n"
        "---\n\n"
    )
    footer = "\n\n---\n\n*Skip automated reviews by including `[skip review]` in the PR title.*"
    return header + report_markdown + footer


def compose_orchestrator_failure_report(
    exc: Exception,
    specialist_findings: dict[str, str],
) -> str:
    completed = sorted(
        agent for agent, text in specialist_findings.items() if not text.startswith(SPECIALIST_FAILURE_PREFIX)
    )
    failed = sorted(
        agent for agent, text in specialist_findings.items() if text.startswith(SPECIALIST_FAILURE_PREFIX)
    )
    completed_summary = ", ".join(f"`{agent}`" for agent in completed) if completed else "(none)"
    failed_summary = ", ".join(f"`{agent}`" for agent in failed) if failed else "(none)"
    return f"""### Blockers
- Automated review orchestration failed before the final consolidated report was produced.

### Concerns
- `{format_error(exc)}`

### Suggestions
- Inspect the GitHub Actions logs for the failing run and re-run the reviewer after fixing the underlying issue.
- Use the specialist passes listed below as rough input only; a human reviewer should still cover type safety, API contract changes, test coverage, and breaking changes before merge.

### What's good
- Completed specialist passes before the orchestrator failed: {completed_summary}
- Specialist passes that failed independently: {failed_summary}

### Verdict
COMMENT. The consolidated automated review did not complete, so human follow-up is required.
"""


async def review_pr(
    pr_number: str,
    specialist_model: str,
    orchestrator_model: str,
    vertex_project: str,
    vertex_region: str,
) -> int:
    pr_meta = fetch_pr_metadata(pr_number)
    if pr_meta.get("isDraft"):
        print(f"PR #{pr_number} is draft — skipping review.")
        return 0
    if "[skip review]" in (pr_meta.get("title") or ""):
        print(f"PR #{pr_number} has [skip review] — skipping.")
        return 0

    diff = fetch_pr_diff(pr_number)
    changed = changed_file_paths(pr_meta)
    active_buckets, docs_only = classify(changed)

    if docs_only and not active_buckets:
        comment = compose_final_comment(
            "Docs-only change. No specialist review dispatched. A human should still confirm the docs match the current SDK surface.",
            buckets=[],
        )
    else:
        client = AsyncAnthropicVertex(project_id=vertex_project, region=vertex_region)
        tasks: list[asyncio.Task[tuple[str, str]]] = []

        for agent in ALWAYS_ON:
            tasks.append(
                asyncio.create_task(
                    run_specialist(
                        client,
                        agent,
                        diff,
                        changed,
                        pr_meta,
                        specialist_model,
                        SPECIALIST_MAX_TOKENS,
                    )
                )
            )

        for bucket in active_buckets:
            scoped_diff = scope_diff_to_prefixes(diff, bucket.prefixes)
            scoped_files = [path for path in changed if any(path.startswith(prefix) for prefix in bucket.prefixes)]
            tasks.append(
                asyncio.create_task(
                    run_specialist(
                        client,
                        bucket.specialist,
                        scoped_diff,
                        scoped_files,
                        pr_meta,
                        specialist_model,
                        SPECIALIST_MAX_TOKENS,
                    )
                )
            )

        results = await asyncio.gather(*tasks)
        findings = dict(results)
        try:
            report = await run_orchestrator(
                client,
                findings,
                pr_meta,
                sorted(bucket.name for bucket in active_buckets),
                docs_only,
                orchestrator_model,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"Orchestrator failed: {format_error(exc)}", file=sys.stderr)
            report = compose_orchestrator_failure_report(exc, findings)
        comment = compose_final_comment(report, sorted(bucket.name for bucket in active_buckets))

    upsert_review_comment(pr_number, comment)
    print(f"Posted review comment on PR #{pr_number}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the SDK PR review agent system.")
    parser.add_argument("--pr", required=True, help="PR number to review.")
    parser.add_argument(
        "--specialist-model",
        default=DEFAULT_SPECIALIST_MODEL,
        help="Vertex model ID for specialist reviewers.",
    )
    parser.add_argument(
        "--orchestrator-model",
        default=DEFAULT_ORCHESTRATOR_MODEL,
        help="Vertex model ID for the consolidating orchestrator.",
    )
    parser.add_argument(
        "--vertex-project",
        default=DEFAULT_VERTEX_PROJECT,
        help="GCP project ID that has Claude published.",
    )
    parser.add_argument(
        "--vertex-region",
        default=DEFAULT_VERTEX_REGION,
        help="GCP region for Claude on Vertex.",
    )
    args = parser.parse_args()

    if "GITHUB_REPOSITORY" not in os.environ:
        print("ERROR: GITHUB_REPOSITORY not set (owner/repo).", file=sys.stderr)
        return 2

    return asyncio.run(
        review_pr(
            args.pr,
            args.specialist_model,
            args.orchestrator_model,
            args.vertex_project,
            args.vertex_region,
        )
    )


if __name__ == "__main__":
    sys.exit(main())
