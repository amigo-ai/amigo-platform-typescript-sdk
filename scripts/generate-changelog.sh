#!/usr/bin/env bash
# Generate a changelog entry from first-parent release history.
# Usage: ./scripts/generate-changelog.sh [--from REF] [--to REF] [--version VERSION]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

node "$SCRIPT_DIR/release-history.mjs" changelog "$@"
