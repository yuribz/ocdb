# --- build stage ---
FROM rust:1-slim-bookworm AS builder
WORKDIR /app

# utoipa-swagger-ui's build script fetches the Swagger UI static assets via curl.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock* ./
COPY src ./src
COPY migrations ./migrations

RUN cargo build --release

# --- runtime stage ---
FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/ocdb ./ocdb
COPY --from=builder /app/migrations ./migrations
COPY static ./static

ENV PORT=3000
EXPOSE 3000

CMD ["./ocdb"]
