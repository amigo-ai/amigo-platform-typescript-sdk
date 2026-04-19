#!/usr/bin/env python3
"""PR reviewer for the platform SDK — Claude on GCP Vertex AI.

Runs a focused SDK review (type safety, API contract, test coverage,
breaking changes) on every PR and posts a structured comment.

Usage:
    uv run --with 'anthropic[vertex]>=0.52.0' --python 3.12 \
        python scripts/pr-review.py --pr 42

Auth: Google Application Default Credentials → AsyncAnthropicVertex.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

from anthropic import AsyncAnthropicVertex
from anthropic.types import Message

COMMENT_MARKER = "<!-- sdk-review:v1 -->"

DEFAULT_MODEL = os.environ.get("REVIEW_MODEL", "claude-sonnet-4-6")
DEFAULT_VERTEX_PROJECT = os.environ.get("VERTEX_PROJECT", "amigo-platform")
DEFAULT_VERTEX_REGION = os.environ.get("VERTEX_REGION", "global")

MAX_DIFF_CHARS = 120_000
MAX_TOKENS = 6000

SYSTEM_PROMPT = """You are a senior TypeScript SDK reviewer for @amigo-ai/platform-sdk.

This SDK wraps the Amigo Platform API using openapi-fetch with auto-generated types.
Review the PR diff for:

1. **Type safety** — strict TypeScript, no `any` leaks, proper use of generated types
2. **API contract** — changes to resources must match the OpenAPI spec, no hand-written types
3. **Error handling** — proper use of the error hierarchy (AmigoError subclasses)
4. **Test coverage** — new code must have tests, mock fixtures must match actual API types
5. **Breaking changes** — renamed exports, changed method signatures, removed fields
6. **Generated code** — never manually edit src/generated/api.ts
7. **Conventions** — single runtime dep (openapi-fetch), dual ESM/CJS, branded types for IDs

Output format (use exactly these headers):

### Blockers
Issues that must be fixed before merge. Empty section = none found.

### Concerns
Non-blocking issues worth addressing. Include reasoning.

### Suggestions
Optional improvements. Be specific with code examples.

### What's good
Acknowledge good patterns (brief, 1-3 bullets).

### Verdict
One of: APPROVE, REQUEST_CHANGES, or COMMENT. One sentence summary.
"""


def fetch_pr_metadata(pr_number: str) -> dict:
    raw = subprocess.check_output(
        ["gh", "pr", "view", pr_number, "--json",
         "number,title,body,headRefName,baseRefName,author,additions,deletions,changedFiles,files,isDraft"],
        text=True,
    )
    return json.loads(raw)


def fetch_pr_diff(pr_number: str) -> str:
    return subprocess.check_output(["gh", "pr", "diff", pr_number], text=True)


def find_prior_comment(pr_number: str) -> str | None:
    raw = subprocess.check_output(
        ["gh", "api", f"repos/{os.environ['GITHUB_REPOSITORY']}/issues/{pr_number}/comments"],
        text=True,
    )
    for c in json.loads(raw):
        if COMMENT_MARKER in (c.get("body") or ""):
            return str(c["id"])
    return None


def delete_comment(comment_id: str) -> None:
    subprocess.run(
        ["gh", "api", "-X", "DELETE",
         f"repos/{os.environ['GITHUB_REPOSITORY']}/issues/comments/{comment_id}"],
        check=True,
    )


def post_comment(pr_number: str, body: str) -> None:
    subprocess.run(["gh", "pr", "comment", pr_number, "--body", body], check=True)


async def review_pr(
    pr_number: str,
    model: str,
    vertex_project: str,
    vertex_region: str,
) -> int:
    pr_meta = fetch_pr_metadata(pr_number)
    if pr_meta.get("isDraft"):
        print(f"PR #{pr_number} is draft — skipping.")
        return 0
    if "[skip review]" in (pr_meta.get("title") or ""):
        print(f"PR #{pr_number} has [skip review] — skipping.")
        return 0

    diff = fetch_pr_diff(pr_number)
    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + "\n\n[... diff truncated ...]"

    changed = [f["path"] for f in pr_meta.get("files", [])]

    client = AsyncAnthropicVertex(project_id=vertex_project, region=vertex_region)

    user_msg = f"""Review the following PR.

**PR #{pr_meta['number']}: {pr_meta['title']}**

Author: {pr_meta['author']['login']}
Branch: {pr_meta['headRefName']} → {pr_meta['baseRefName']}
Size: +{pr_meta['additions']} / -{pr_meta['deletions']} across {pr_meta['changedFiles']} files

Changed files:
{chr(10).join(f'  - {p}' for p in changed)}

PR body:
{pr_meta.get('body') or '(empty)'}

---
DIFF:
{diff}
"""

    try:
        response: Message = await client.messages.create(
            model=model,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )
        review_text = "\n".join(
            b.text for b in response.content if getattr(b, "type", None) == "text"
        ).strip()
    except Exception as exc:
        review_text = f"⚠️ Review failed: `{type(exc).__name__}: {exc}`"

    comment = (
        f"{COMMENT_MARKER}\n"
        "# Claude Code Review\n\n"
        f"Reviewed by Claude (`{model}`) on GCP Vertex AI.\n\n"
        "---\n\n"
        f"{review_text}\n\n"
        "---\n\n"
        "*Skip automated reviews by including `[skip review]` in the PR title.*"
    )

    prior = find_prior_comment(pr_number)
    if prior:
        delete_comment(prior)
    post_comment(pr_number, comment)
    print(f"Posted review on PR #{pr_number}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="SDK PR reviewer (Claude on Vertex).")
    parser.add_argument("--pr", required=True)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--vertex-project", default=DEFAULT_VERTEX_PROJECT)
    parser.add_argument("--vertex-region", default=DEFAULT_VERTEX_REGION)
    args = parser.parse_args()

    if "GITHUB_REPOSITORY" not in os.environ:
        print("ERROR: GITHUB_REPOSITORY not set.", file=sys.stderr)
        return 2

    return asyncio.run(review_pr(args.pr, args.model, args.vertex_project, args.vertex_region))


if __name__ == "__main__":
    sys.exit(main())
