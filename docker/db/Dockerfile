# Debian-based Postgres (official image ships PGDG apt sources).
# pgvector + pgvectorscale (StreamingDiskANN), no TimescaleDB.
FROM postgres:18-bookworm

USER root

ARG TARGETARCH=amd64

RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    wget ca-certificates unzip \
    postgresql-18-pgvector; \
  PGVS_ARCH="${TARGETARCH}"; \
  case "$PGVS_ARCH" in amd64|arm64) ;; *) echo "unsupported TARGETARCH for pgvectorscale: $PGVS_ARCH" >&2; exit 1 ;; esac; \
  wget -q "https://github.com/timescale/pgvectorscale/releases/download/0.9.0/pgvectorscale-0.9.0-pg18-${PGVS_ARCH}.zip" -O /tmp/pgvectorscale.zip; \
  unzip -o /tmp/pgvectorscale.zip -d /tmp/pgvectorscale; \
  dpkg -i "/tmp/pgvectorscale/pgvectorscale-postgresql-18_0.9.0-Linux_${PGVS_ARCH}.deb"; \
  rm -rf /tmp/pgvectorscale /tmp/pgvectorscale.zip; \
  apt-get purge -y --auto-remove wget unzip; \
  rm -rf /var/lib/apt/lists/*

USER postgres
