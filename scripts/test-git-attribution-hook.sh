#!/bin/sh
# scripts/test-git-attribution-hook.sh
# Comprehensive test suite for UpTrack Git attribution validator and hooks.
set -e

PASSED_COUNT=0
FAILED_COUNT=0

assert_success() {
  DESC="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "  [PASS] $DESC"
    PASSED_COUNT=$((PASSED_COUNT + 1))
  else
    echo "  [FAIL] $DESC (expected success, but command failed)"
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi
}

assert_failure() {
  DESC="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "  [FAIL] $DESC (expected failure, but command succeeded)"
    FAILED_COUNT=$((FAILED_COUNT + 1))
  else
    echo "  [PASS] $DESC"
    PASSED_COUNT=$((PASSED_COUNT + 1))
  fi
}

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
VALIDATOR="$REPO_ROOT/scripts/validate-git-attribution.sh"

echo "=== UpTrack Git Attribution Test Suite ==="
echo "Validator under test: $VALIDATOR"
echo ""

TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t 'uptrack_test')"
trap 'rm -rf "$TMP_DIR"' EXIT

cd "$TMP_DIR"
git init -q
git config user.name "alexc83"
git config user.email "alexc83@users.noreply.github.com"

# Replicate repository structure in temp directory
mkdir -p "$TMP_DIR/scripts" "$TMP_DIR/.githooks"
cp "$REPO_ROOT/scripts/validate-git-attribution.sh" "$TMP_DIR/scripts/validate-git-attribution.sh"
cp "$REPO_ROOT/.githooks/pre-commit" "$TMP_DIR/.githooks/pre-commit"
cp "$REPO_ROOT/.githooks/commit-msg" "$TMP_DIR/.githooks/commit-msg"
chmod +x "$TMP_DIR/scripts/validate-git-attribution.sh" "$TMP_DIR/.githooks/pre-commit" "$TMP_DIR/.githooks/commit-msg"

echo "1. Identity validation unit tests:"

# Test 1.1: Valid author and committer
assert_success "Valid owner identity (alexc83 <alexc83@users.noreply.github.com>)" \
  "$TMP_DIR/scripts/validate-git-attribution.sh" --check-ident

# Test 1.2: Invalid author name
assert_failure "Rejects AI author name (Claude)" \
  env GIT_AUTHOR_NAME="Claude" "$TMP_DIR/scripts/validate-git-attribution.sh" --check-ident

# Test 1.3: Invalid author email
assert_failure "Rejects AI author email (claude@anthropic.com)" \
  env GIT_AUTHOR_EMAIL="claude@anthropic.com" "$TMP_DIR/scripts/validate-git-attribution.sh" --check-ident

# Test 1.4: Invalid committer name
assert_failure "Rejects AI committer name (Mistral Vibe)" \
  env GIT_COMMITTER_NAME="Mistral Vibe" "$TMP_DIR/scripts/validate-git-attribution.sh" --check-ident

# Test 1.5: Invalid committer email
assert_failure "Rejects AI committer email (vibe@mistral.ai)" \
  env GIT_COMMITTER_EMAIL="vibe@mistral.ai" "$TMP_DIR/scripts/validate-git-attribution.sh" --check-ident

# Test 1.6: Non-AI unexpected identity
assert_failure "Rejects other non-owner identity (Jane Doe <jane@example.com>)" \
  env GIT_AUTHOR_NAME="Jane Doe" GIT_AUTHOR_EMAIL="jane@example.com" "$TMP_DIR/scripts/validate-git-attribution.sh" --check-ident

# Test 1.7: Dependabot identity permitted
assert_success "Permits legitimate Dependabot activity (author dependabot[bot], committer GitHub)" \
  env GIT_AUTHOR_NAME="dependabot[bot]" GIT_AUTHOR_EMAIL="49699333+dependabot[bot]@users.noreply.github.com" GIT_COMMITTER_NAME="GitHub" GIT_COMMITTER_EMAIL="noreply@github.com" "$TMP_DIR/scripts/validate-git-attribution.sh" --check-ident

# Test 1.8: Dependabot commit rebased by owner permitted
assert_success "Permits Dependabot commit rebased by owner (author dependabot[bot], committer alexc83)" \
  env GIT_AUTHOR_NAME="dependabot[bot]" GIT_AUTHOR_EMAIL="49699333+dependabot[bot]@users.noreply.github.com" GIT_COMMITTER_NAME="alexc83" GIT_COMMITTER_EMAIL="alexc83@users.noreply.github.com" "$TMP_DIR/scripts/validate-git-attribution.sh" --check-ident

echo ""
echo "2. Commit message validation unit tests:"

check_msg_content() {
  printf '%b\n' "$1" > "$TMP_DIR/test_msg.txt"
  "$TMP_DIR/scripts/validate-git-attribution.sh" --check-msg "$TMP_DIR/test_msg.txt"
}

# Test 2.1: Valid standard commit message
assert_success "Allows standard conventional commit message" \
  check_msg_content "feat(dashboard): add refresh button for credential metrics"

# Test 2.2: Legitimate mention of AI tools in description
assert_success "Allows legitimate mentions of AI tools in subject/body text" \
  check_msg_content "docs(agents): update policy regarding Claude and Gemini instructions"

# Test 2.3: Comments stripped properly
assert_success "Ignores commented-out text in git commit template" \
  check_msg_content "fix(auth): fix token expiration\n# Co-Authored-By: Claude <noreply@anthropic.com>"

# Test 2.4: Dependabot sign-off trailer permitted
assert_success "Allows legitimate Dependabot Signed-off-by trailer" \
  check_msg_content "chore(deps-dev): bump qs\n\nSigned-off-by: dependabot[bot] <support@github.com>"

# Test 2.5: Prohibited Co-Authored-By Claude
assert_failure "Rejects 'Co-Authored-By: Claude <noreply@anthropic.com>'" \
  check_msg_content "feat: test\n\nCo-Authored-By: Claude <noreply@anthropic.com>"

# Test 2.6: Prohibited Co-Authored-By Gemini
assert_failure "Rejects 'Co-Authored-By: Gemini <gemini@google.com>'" \
  check_msg_content "feat: test\n\nCo-Authored-By: Gemini <gemini@google.com>"

# Test 2.7: Prohibited Co-Authored-By Mistral Vibe
assert_failure "Rejects 'Co-authored-by: Mistral Vibe <vibe@mistral.ai>'" \
  check_msg_content "feat: test\n\nCo-authored-by: Mistral Vibe <vibe@mistral.ai>"

# Test 2.8: Prohibited Co-Authored-By OpenAI Codex
assert_failure "Rejects 'Co-authored-by: OpenAI Codex <codex@openai.com>'" \
  check_msg_content "feat: test\n\nCo-authored-by: OpenAI Codex <codex@openai.com>"

# Test 2.9: Prohibited Signed-off-by AI
assert_failure "Rejects 'Signed-off-by: Claude <claude@anthropic.com>'" \
  check_msg_content "feat: test\n\nSigned-off-by: Claude <claude@anthropic.com>"

# Test 2.10: Prohibited Generated by Claude Code
assert_failure "Rejects 'Generated by Claude Code'" \
  check_msg_content "feat: test\n\nGenerated by Claude Code"

# Test 2.11: Prohibited 🤖 Generated with...
assert_failure "Rejects '🤖 Generated with Claude Code'" \
  check_msg_content "feat: test\n\n🤖 Generated with Claude Code"

# Test 2.12: Prohibited Created with Gemini
assert_failure "Rejects 'Created with Google Gemini'" \
  check_msg_content "feat: test\n\nCreated with Google Gemini"

# Test 2.13: Prohibited Assisted-by Copilot
assert_failure "Rejects 'Assisted-by: GitHub Copilot'" \
  check_msg_content "feat: test\n\nAssisted-by: GitHub Copilot"

# Test 2.14: Prohibited Written using ChatGPT
assert_failure "Rejects 'Written using ChatGPT'" \
  check_msg_content "feat: test\n\nWritten using ChatGPT"

# Test 2.15: Verify bypass was removed: setting bypass env var STILL fails
check_with_env_bypass() {
  printf '%b\n' "$1" > "$TMP_DIR/test_msg.txt"
  UPTRACK_ALLOW_AI_ATTRIBUTION=1 "$TMP_DIR/scripts/validate-git-attribution.sh" --check-msg "$TMP_DIR/test_msg.txt"
}
assert_failure "Rejects AI attribution even when UPTRACK_ALLOW_AI_ATTRIBUTION=1 is set (bypass removed)" \
  check_with_env_bypass "feat: test\n\nCo-Authored-By: Claude <noreply@anthropic.com>"

echo ""
echo "3. End-to-end Git Hook integration tests:"

# Configure hooksPath
git config core.hooksPath .githooks

stage_new_change() {
  echo "$1" >> "$TMP_DIR/sample.txt"
  git add "$TMP_DIR/sample.txt"
}

# Test 3.1: Commit fails when --author is an AI agent
stage_new_change "change 1"
assert_failure "Hook rejects 'git commit --author=Claude <claude@anthropic.com>'" \
  git commit --author="Claude <claude@anthropic.com>" -m "feat: initial commit"

# Test 3.2: Commit fails when GIT_COMMITTER_NAME is an AI agent
stage_new_change "change 2"
assert_failure "Hook rejects commit with GIT_COMMITTER_NAME=Codex" \
  env GIT_COMMITTER_NAME="Codex" GIT_COMMITTER_EMAIL="codex@openai.com" git commit -m "feat: initial commit"

# Test 3.3: Commit fails when commit message contains AI trailer
stage_new_change "change 3"
MSG_WITH_TRAILER=$(printf 'feat: initial commit\n\nCo-Authored-By: Claude <noreply@anthropic.com>')
assert_failure "Hook rejects 'git commit -m \"...Co-Authored-By: Claude...\"'" \
  git commit -m "$MSG_WITH_TRAILER"

# Test 3.4: Legitimate commit succeeds
stage_new_change "change 4"
assert_success "Hook accepts valid commit by owner with clean message" \
  git commit -m "feat: valid initial commit by alexc83"

# Test 3.5: Legitimate commit with AI mentioned in subject succeeds
stage_new_change "change 5"
assert_success "Hook accepts commit discussing Claude/Gemini docs in message" \
  git commit -m "docs(agents): update Gemini and Claude instructions for attribution policy"

echo ""
echo "=== Test Results ==="
echo "Passed: $PASSED_COUNT"
echo "Failed: $FAILED_COUNT"

if [ "$FAILED_COUNT" -gt 0 ]; then
  echo "TEST SUITE FAILED!"
  exit 1
fi

echo "ALL TESTS PASSED!"
exit 0
