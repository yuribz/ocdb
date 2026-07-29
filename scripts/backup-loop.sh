#!/usr/bin/env bash
set -euo pipefail

# Long-running wrapper for the `backup` sidecar's main process: runs
# backup.sh immediately, then repeats every BACKUP_INTERVAL_SECONDS. A
# failed backup does not kill the loop — it retries next interval instead
# of the container exiting and silently losing future backups.

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[backup-loop] starting; interval=${INTERVAL}s"
while true; do
    "${SCRIPT_DIR}/backup.sh" || echo "[backup-loop] backup.sh failed with exit code $?; will retry next interval"
    sleep "$INTERVAL"
done
