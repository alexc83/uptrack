#!/bin/sh
# scripts/install-git-hooks.sh
# Enables UpTrack's version-controlled Git hooks for the local repository.
set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

echo "Configuring core.hooksPath to .githooks..."
git config core.hooksPath .githooks

echo "Ensuring hook scripts are executable..."
chmod +x .githooks/* scripts/validate-git-attribution.sh scripts/uninstall-git-hooks.sh 2>/dev/null || true

echo "Checking Git identity configuration..."
CURRENT_NAME="$(git config user.name 2>/dev/null || echo '<unset>')"
CURRENT_EMAIL="$(git config user.email 2>/dev/null || echo '<unset>')"

echo "  Current user.name:  $CURRENT_NAME"
echo "  Current user.email: $CURRENT_EMAIL"

EXPECTED_NAME="alexc83"
EXPECTED_EMAIL="alexc83@users.noreply.github.com"

if [ "$CURRENT_NAME" != "$EXPECTED_NAME" ] || [ "$CURRENT_EMAIL" != "$EXPECTED_EMAIL" ]; then
  echo ""
  echo "WARNING: Local Git identity does not match the canonical owner identity."
  echo "To set local repository configuration, run:"
  echo "  git config user.name \"$EXPECTED_NAME\""
  echo "  git config user.email \"$EXPECTED_EMAIL\""
else
  echo "  Identity matches required owner configuration ($EXPECTED_NAME <$EXPECTED_EMAIL>)."
fi

echo ""
echo "UpTrack Git attribution hooks successfully enabled."
echo "To disable hooks at any time, run: git config --unset core.hooksPath"
