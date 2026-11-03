#!/bin/sh
# scripts/validate-git-attribution.sh
# Validates commit author, committer, and commit message attribution against UpTrack policy.

set -e

EXPECTED_NAME="alexc83"
EXPECTED_EMAIL="alexc83@users.noreply.github.com"

# Prohibited AI pattern regex for grep -E -i
# AI agent names and terms: claude, anthropic, gemini, openai, codex, chatgpt, copilot, mistral, vibe, antigravity, deepseek, cursor, bot, ai, llm
AI_IDENT_PAT='claude|anthropic|gemini|openai|codex|chatgpt|copilot|mistral|vibe|antigravity|deepseek|cursor|([^a-zA-Z0-9]|^)(bot|ai|llm)($|[^a-zA-Z0-9])'

# Prohibited trailers (Co-Authored-By, Signed-off-by, Authored-by, Assisted-by, Created-by, Committed-by)
TRAILER_PAT="^[[:space:]]*(co-authored-by|signed-off-by|authored-by|assisted-by|created-by|committed-by):.*($AI_IDENT_PAT)"

# Prohibited attribution sentences/phrases
PHRASE_PAT="^[[:space:]]*(generated|created|written|produced|prompted|made|built)[[:space:]]+(by|with|using)[[:space:]]+.*($AI_IDENT_PAT)"
GEN_TRAILER_PAT="^[[:space:]]*generated-[a-z]+:.*($AI_IDENT_PAT)"
ROBOT_PAT="^[[:space:]]*🤖.*[Gg]enerated"

validate_identity() {
  # Resolve Author ident using git var if available
  AUTHOR_IDENT="$(git var GIT_AUTHOR_IDENT 2>/dev/null || true)"
  AUTHOR_NAME="$(printf '%s\n' "$AUTHOR_IDENT" | sed -n 's/ <.*//p')"
  AUTHOR_EMAIL="$(printf '%s\n' "$AUTHOR_IDENT" | sed -n 's/.*<\(.*\)>.*/\1/p')"

  # Fallback to env or git config if git var was empty
  if [ -z "$AUTHOR_NAME" ]; then
    AUTHOR_NAME="${GIT_AUTHOR_NAME:-$(git config user.name 2>/dev/null || true)}"
  fi
  if [ -z "$AUTHOR_EMAIL" ]; then
    AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-$(git config user.email 2>/dev/null || true)}"
  fi

  # Resolve Committer ident using git var if available
  COMMITTER_IDENT="$(git var GIT_COMMITTER_IDENT 2>/dev/null || true)"
  COMMITTER_NAME="$(printf '%s\n' "$COMMITTER_IDENT" | sed -n 's/ <.*//p')"
  COMMITTER_EMAIL="$(printf '%s\n' "$COMMITTER_IDENT" | sed -n 's/.*<\(.*\)>.*/\1/p')"

  # Fallback to env or git config if git var was empty
  if [ -z "$COMMITTER_NAME" ]; then
    COMMITTER_NAME="${GIT_COMMITTER_NAME:-$(git config user.name 2>/dev/null || true)}"
  fi
  if [ -z "$COMMITTER_EMAIL" ]; then
    COMMITTER_EMAIL="${GIT_COMMITTER_EMAIL:-$(git config user.email 2>/dev/null || true)}"
  fi

  # Allow legitimate Dependabot activity (e.g., automated dependency updates or rebases)
  if [ "$AUTHOR_NAME" = "dependabot[bot]" ] && printf '%s\n' "$AUTHOR_EMAIL" | grep -Eq '([0-9]+\+)?dependabot\[bot\]@users\.noreply\.github\.com'; then
    case "$COMMITTER_NAME" in
      "GitHub"|"dependabot[bot]"|"$EXPECTED_NAME")
        return 0
        ;;
    esac
  fi

  FAILED=0

  # Check Author Name & Email
  if [ "$AUTHOR_NAME" != "$EXPECTED_NAME" ] || [ "$AUTHOR_EMAIL" != "$EXPECTED_EMAIL" ]; then
    echo "ERROR: [git-attribution] Invalid commit author!" >&2
    echo "  Observed author: $AUTHOR_NAME <$AUTHOR_EMAIL>" >&2
    echo "  Required author: $EXPECTED_NAME <$EXPECTED_EMAIL>" >&2
    FAILED=1
  fi

  # Check Committer Name & Email
  if [ "$COMMITTER_NAME" != "$EXPECTED_NAME" ] || [ "$COMMITTER_EMAIL" != "$EXPECTED_EMAIL" ]; then
    echo "ERROR: [git-attribution] Invalid commit committer!" >&2
    echo "  Observed committer: $COMMITTER_NAME <$COMMITTER_EMAIL>" >&2
    echo "  Required committer: $EXPECTED_NAME <$EXPECTED_EMAIL>" >&2
    FAILED=1
  fi

  # Check for AI agent attribution in author/committer ident
  if printf '%s\n' "$AUTHOR_NAME $AUTHOR_EMAIL $COMMITTER_NAME $COMMITTER_EMAIL" | grep -v -i 'dependabot' | grep -E -i "$AI_IDENT_PAT" >/dev/null 2>&1; then
    echo "ERROR: [git-attribution] Prohibited AI agent detected in author or committer identity!" >&2
    FAILED=1
  fi

  if [ "$FAILED" -ne 0 ]; then
    echo "" >&2
    echo "UpTrack Git policy requires all owner commits to use:" >&2
    echo "  git config user.name \"$EXPECTED_NAME\"" >&2
    echo "  git config user.email \"$EXPECTED_EMAIL\"" >&2
    echo "Never configure AI tools (Claude, Mistral Vibe, Codex, Gemini, etc.) as commit author or committer." >&2
    return 1
  fi

  return 0
}

validate_message() {
  MSG_FILE="$1"
  if [ -z "$MSG_FILE" ] || [ ! -f "$MSG_FILE" ]; then
    echo "ERROR: [git-attribution] Commit message file not found: '$MSG_FILE'" >&2
    return 1
  fi

  # Strip comment lines (core.commentChar default #)
  CLEAN_MSG="$(git stripspace --strip-comments < "$MSG_FILE" 2>/dev/null || grep -v '^[[:space:]]*#' "$MSG_FILE" || true)"

  # Filter out lines that are legitimate Dependabot attribution
  MSG_TO_CHECK="$(printf '%s\n' "$CLEAN_MSG" | grep -v -i 'dependabot' || true)"

  MSG_FAILED=0

  # Check prohibited trailer patterns
  MATCHED_TRAILER="$(printf '%s\n' "$MSG_TO_CHECK" | grep -E -i "$TRAILER_PAT" || true)"
  if [ -n "$MATCHED_TRAILER" ]; then
    echo "ERROR: [git-attribution] Prohibited AI attribution trailer found in commit message:" >&2
    printf '%s\n' "$MATCHED_TRAILER" | sed 's/^/  /' >&2
    MSG_FAILED=1
  fi

  # Check prohibited attribution sentences / phrases
  MATCHED_PHRASE="$(printf '%s\n' "$MSG_TO_CHECK" | grep -E -i "$PHRASE_PAT" || true)"
  if [ -n "$MATCHED_PHRASE" ]; then
    echo "ERROR: [git-attribution] Prohibited AI attribution statement found in commit message:" >&2
    printf '%s\n' "$MATCHED_PHRASE" | sed 's/^/  /' >&2
    MSG_FAILED=1
  fi

  # Check generated-* trailer
  MATCHED_GEN_TRAILER="$(printf '%s\n' "$MSG_TO_CHECK" | grep -E -i "$GEN_TRAILER_PAT" || true)"
  if [ -n "$MATCHED_GEN_TRAILER" ]; then
    echo "ERROR: [git-attribution] Prohibited AI generated trailer found in commit message:" >&2
    printf '%s\n' "$MATCHED_GEN_TRAILER" | sed 's/^/  /' >&2
    MSG_FAILED=1
  fi

  # Check robot icon phrase
  MATCHED_ROBOT="$(printf '%s\n' "$MSG_TO_CHECK" | grep -E -i "$ROBOT_PAT" || true)"
  if [ -n "$MATCHED_ROBOT" ]; then
    echo "ERROR: [git-attribution] Prohibited AI generation footer found in commit message:" >&2
    printf '%s\n' "$MATCHED_ROBOT" | sed 's/^/  /' >&2
    MSG_FAILED=1
  fi

  if [ "$MSG_FAILED" -ne 0 ]; then
    echo "" >&2
    echo "UpTrack Git policy strictly prohibits AI attribution (Co-Authored-By, Signed-off-by, Generated by, etc.)." >&2
    echo "Please remove the prohibited attribution line(s) from the commit message." >&2
    return 1
  fi

  return 0
}

case "$1" in
  --pre-commit)
    validate_identity
    ;;
  --commit-msg)
    shift
    validate_identity
    validate_message "$1"
    ;;
  --check-ident)
    validate_identity
    ;;
  --check-msg)
    shift
    validate_message "$1"
    ;;
  *)
    if [ -n "$1" ] && [ -f "$1" ]; then
      validate_identity
      validate_message "$1"
    elif [ -z "$1" ]; then
      validate_identity
    else
      echo "Usage: $0 [--pre-commit | --commit-msg <msg_file> | --check-ident | --check-msg <msg_file>]" >&2
      exit 1
    fi
    ;;
esac
