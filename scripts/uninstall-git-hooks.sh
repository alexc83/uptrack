#!/bin/sh
# scripts/uninstall-git-hooks.sh
# Disables UpTrack's opt-in Git hooks by unsetting core.hooksPath.
set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

git config --unset core.hooksPath 2>/dev/null || true
echo "UpTrack Git hooks disabled (core.hooksPath unset)."
