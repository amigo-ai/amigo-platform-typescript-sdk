# SDK PR Review Orchestrator

Python script that runs the SDK's specialist review agents against a PR and
posts one consolidated review comment. Claude runs on GCP Vertex AI, matching
the rest of Amigo's Claude integrations.

## How it works

1. `.github/workflows/pr-review.yml` triggers on SDK surface, test, dependency,
   and workflow changes.
2. `scripts/pr_review/__main__.py` loads the specialist prompts from
   `.claude/agents/`.
3. The script classifies the PR into SDK surface, tests, and CI/release
   buckets.
4. Matching specialists plus the always-on principles and security reviewers
   run in parallel on Claude Sonnet.
5. A code-review orchestrator consolidates their findings into one PR comment
   and replaces the prior comment via a stable HTML marker.

## Local run

```bash
export GITHUB_REPOSITORY=amigo-ai/amigo-platform-typescript-sdk
uv run --python 3.12 --with 'anthropic[vertex]>=0.52.0' \
  python -m scripts.pr_review --pr 23
```

## Environment

| Var | Purpose | Default |
|---|---|---|
| `GITHUB_REPOSITORY` | `owner/repo` for PR comment lookups | required |
| `GH_TOKEN` | `gh` CLI auth | `GITHUB_TOKEN` in CI |
| `VERTEX_PROJECT` | GCP project with Claude on Vertex | `amigo-platform` |
| `VERTEX_REGION` | Vertex region | `global` |
| `REVIEW_MODEL` | specialist model ID | `claude-sonnet-4-6` |
| `REVIEW_ORCHESTRATOR_MODEL` | consolidator model ID | `claude-opus-4-6` |

The workflow uses `google-github-actions/auth` to set up ADC in CI. Local runs
need valid Google ADC as well.
