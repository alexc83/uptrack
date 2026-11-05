#!/usr/bin/env bash
# No provider access. Python tests deny all sockets and use an in-memory provider double.
set +x
set -euo pipefail
umask 077
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHONDONTWRITEBYTECODE=1 python3 "$HERE/test_pilot.py"
