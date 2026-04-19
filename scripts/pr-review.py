#!/usr/bin/env python3
"""Backward-compatible wrapper for the PR review orchestrator."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.pr_review.__main__ import main


if __name__ == "__main__":
    raise SystemExit(main())
