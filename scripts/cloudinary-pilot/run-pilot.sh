#!/usr/bin/env bash
# Issue #23: owner-authorized non-production use only. Never run with shell tracing.
set +x
set -euo pipefail
umask 077
exec python3 "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pilot.py" "$@"
