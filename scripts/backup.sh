#!/usr/bin/env bash
set -euo pipefail

# Single-shot Postgres backup: pg_dump in custom format (-Fc) to a
# timestamped file under BACKUP_DIR, then prunes dumps older than
# RETENTION_DAYS. Reads connection info from PGHOST/PGPORT/PGUSER/
# PGPASSWORD/PGDATABASE env vars (libpq convention) so the password never
# appears in argv/`ps` output.

: "${PGHOST:?PGHOST must be set}"
: "${PGUSER:?PGUSER must be set}"
: "${PGPASSWORD:?PGPASSWORD must be set}"
: "${PGDATABASE:?PGDATABASE must be set}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump_file="${BACKUP_DIR}/ocdb-${timestamp}.dump"

echo "[backup] starting pg_dump -> ${dump_file}"
pg_dump -Fc --no-password -f "$dump_file"
echo "[backup] pg_dump complete ($(du -h "$dump_file" | cut -f1))"

echo "[backup] pruning dumps older than ${RETENTION_DAYS} days in ${BACKUP_DIR}"
find "$BACKUP_DIR" -maxdepth 1 -name 'ocdb-*.dump' -type f -mtime "+${RETENTION_DAYS}" -print -delete

echo "[backup] done"
