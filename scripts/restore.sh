#!/usr/bin/env bash
set -euo pipefail

# Restores a pg_dump custom-format (-Fc) dump into the target database.
#
# DESTRUCTIVE: --clean --if-exists drops existing objects in the target
# database before recreating them from the dump. Anything currently in the
# target database that isn't in the dump is gone after this runs.
#
# Usage:
#   PGHOST=db PGUSER=ocdb PGPASSWORD=ocdb PGDATABASE=ocdb \
#     ./restore.sh /backups/ocdb-20260727T000000Z.dump
#
# Set CONFIRM=yes to skip the interactive confirmation prompt.

: "${PGHOST:?PGHOST must be set}"
: "${PGUSER:?PGUSER must be set}"
: "${PGPASSWORD:?PGPASSWORD must be set}"
: "${PGDATABASE:?PGDATABASE must be set}"

dump_file="${1:-}"
if [[ -z "$dump_file" ]]; then
    echo "usage: $0 <path-to-dump-file>" >&2
    exit 1
fi
if [[ ! -f "$dump_file" ]]; then
    echo "error: dump file not found: $dump_file" >&2
    exit 1
fi

if [[ "${CONFIRM:-}" != "yes" ]]; then
    echo "WARNING: this will DROP and recreate objects in database '${PGDATABASE}' on host '${PGHOST}'."
    read -r -p "Type the database name (${PGDATABASE}) to confirm: " confirm
    if [[ "$confirm" != "$PGDATABASE" ]]; then
        echo "confirmation did not match, aborting." >&2
        exit 1
    fi
fi

echo "[restore] restoring ${dump_file} into ${PGDATABASE}@${PGHOST}"
pg_restore --clean --if-exists --no-owner --no-password -d "$PGDATABASE" "$dump_file"
echo "[restore] done"
