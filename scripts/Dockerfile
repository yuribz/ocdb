# Bakes the backup scripts into a postgres:16-alpine image so the `backup`
# compose service doesn't need a host bind mount for them — some Docker
# setups (e.g. Docker Desktop's restricted file sharing) block bind mounts
# outside explicitly allowlisted host directories, while build-time COPY
# always works regardless of that setting.
FROM postgres:16-alpine

COPY backup.sh backup-loop.sh restore.sh /scripts/
RUN chmod +x /scripts/*.sh

ENTRYPOINT ["/scripts/backup-loop.sh"]
