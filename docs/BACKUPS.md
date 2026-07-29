# Backups

Postgres is backed up automatically by the `backup` service in
`docker-compose.yml`. It runs `pg_dump -Fc` (custom format — supports
selective/parallel restores via `pg_restore`) on a fixed interval and
prunes old dumps.

## Schedule

- Runs `scripts/backup.sh` immediately on container start, then every
  `BACKUP_INTERVAL_SECONDS` (default `86400` = daily). Configurable via
  the `backup` service's environment in `docker-compose.yml`.
- Dumps land in the `ocdb-backups` named Docker volume (mounted at
  `/backups` inside the container), named `ocdb-<UTC timestamp>.dump`.
  See "Getting backups off this machine" below for why a named volume
  isn't the end of the story.
- Dumps older than `RETENTION_DAYS` (default `14`) are deleted after each
  run.
- Implemented as a plain shell loop (`scripts/backup-loop.sh`), baked into
  a small image built from `scripts/Dockerfile` (`FROM postgres:16-alpine`
  — same version as the `db` service, so `pg_dump` always matches the
  server). No cron daemon, nothing beyond that already-trusted base image.

**Why a named volume instead of a host folder:** the original design
bind-mounted `./scripts` and `./backups` directly from the project
directory. On this machine, Docker Desktop's file-sharing restrictions
block bind mounts outside its allowlisted host directories, and this
project's path wasn't on that list — see "Switching to a host-visible
folder" below if you'd rather have `./backups/` show up directly in the
project directory.

## On-demand backup

The `backup` service is normally already running (as `backup-loop.sh`).
To trigger an extra backup without waiting for the schedule, run the
script inside the already-running container:

```
docker compose exec backup /scripts/backup.sh
```

If the `backup` service isn't running for some reason, use
`docker compose run --rm backup /scripts/backup.sh` instead.

## Restoring

**This is destructive.** `pg_restore --clean --if-exists` drops existing
database objects before recreating them from the dump — anything in the
target database that isn't in the dump is gone afterwards. The script
prompts for confirmation by typing the database name; set `CONFIRM=yes` to
skip that for scripted use.

```
docker compose exec backup /scripts/restore.sh /backups/ocdb-20260727T000000Z.dump
```

## Getting backups off this machine — do this

Dumps in the `ocdb-backups` volume live on the **same disk** as the
Postgres data volume, regardless of whether it's a named volume or a bind
mount. This protects against things like an accidental `DROP TABLE` or a
bad migration — it does **not** protect against disk failure, host loss,
or "the whole machine is gone." Periodically get a copy somewhere else.

To copy everything out of the volume onto the host in one shot:

```
docker run --rm -v ocdb_ocdb-backups:/from -v "$(pwd)/backups":/to alpine \
  sh -c "cp -a /from/. /to/"
```
(creates `./backups/` on the host with the current dump files; adjust the
volume name if `docker volume ls` shows a different project prefix than
`ocdb_`). Then copy `./backups/` to another disk, another machine, or
cloud storage — nothing here automates that step.

## Switching to a host-visible folder

If you'd rather dumps land directly in `./backups/` on the host as they're
created (no manual copy step), and your Docker setup allows bind-mounting
this project directory:

1. Docker Desktop: Settings → Resources → File Sharing → add this
   project's directory (or its parent) to the allowed list, then restart
   Docker Desktop.
2. In `docker-compose.yml`, change the `backup` service's `volumes:` entry
   from `ocdb-backups:/backups` to `./backups:/backups`, and remove the
   top-level `ocdb-backups:` volume declaration if you no longer need it.
   You can keep `build: ./scripts` as-is, or revert to
   `image: postgres:16-alpine` + bind-mounting `./scripts:/scripts:ro` +
   `entrypoint: ["/scripts/backup-loop.sh"]` — both work identically once
   bind mounts are allowed.

## Notes

- The `backup` container runs as root, so if you switch to a host bind
  mount, dump files under `./backups/` on the host will be root-owned
  (`sudo chown -R "$USER" ./backups` if inconvenient).
- If you do switch to bind-mounting `scripts/`, its `*.sh` files need to be
  executable on the host (`chmod +x scripts/*.sh`) before `docker compose
  up`, since a read-only bind mount preserves whatever execute bit is
  already set but can't have it changed from inside the container.
