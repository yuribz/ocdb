# Crates used in OCDB

A quick reference for what each dependency in `Cargo.toml` does and why it's here.

## Web / async runtime

- **axum** (`features = ["multipart"]`) — the HTTP web framework. Routes
  requests to handler functions, extracts path/query/JSON data, and turns
  return values into HTTP responses. Chosen for its tight integration with
  `tokio` and `tower`. The `multipart` feature adds
  `axum::extract::Multipart`, used by the image upload endpoint.
- **tokio** (`features = ["full"]`) — the async runtime that powers axum and
  sqlx. Nothing in this project `await`s without it.
- **tower** / **tower-http** — middleware building blocks. We use
  `tower-http`'s `fs` feature to serve the static frontend (`ServeDir`) and
  `trace` to log every request/response via `tracing`.

## Database

- **sqlx** (`features = ["runtime-tokio-rustls", "postgres", "uuid",
  "chrono", "migrate", "json"]`) — async SQL toolkit for Postgres. We use its
  runtime query API (`sqlx::query_as::<_, T>(...)`) rather than the
  compile-time-checked `query!` macros, so the project builds without a live
  database connection. The `migrate` feature also runs the SQL files in
  `migrations/` on startup.

## Object storage

- **aws-sdk-s3** / **aws-config** — S3 client for the image catalog. Talks
  to any S3-compatible endpoint, not just AWS, which is why it's the right
  choice even pointed at a self-hosted MinIO instance locally:
  `S3_ENDPOINT_URL` + `force_path_style(true)` (MinIO needs path-style
  bucket addressing) is the only thing that differs from pointing this at
  real AWS S3. `aws-config` builds the shared client config (credentials,
  region, endpoint); `aws-sdk-s3` is the service client itself
  (`put_object`, `create_bucket`, `put_bucket_policy`, ...).

## Serialization

- **serde** / **serde_json** — turns Rust structs into JSON (API responses)
  and back (request bodies). `serde_json::Value` also backs the `extra` JSONB
  column on `Character`, so the schema can grow without a migration.
- **uuid** (`features = ["v4", "serde"]`) — primary key type for every table.
- **chrono** (`features = ["serde"]`) — date/time types (`NaiveDate` for
  birthdays, `DateTime<Utc>` for timestamps).

## Errors & config

- **thiserror** — derives `std::error::Error` for `AppError`, our single
  error type that all handlers return.
- **anyhow** — used in `main.rs` and `config.rs` for ergonomic error context
  (`.context(...)`) around startup failures (bad env vars, DB connection).
- **dotenvy** — loads a local `.env` file (see `.env.example`) so you don't
  have to export environment variables by hand when running via `cargo run`.

## Observability

- **tracing** / **tracing-subscriber** (`features = ["env-filter"]`) —
  structured logging. Verbosity is controlled by the `RUST_LOG` env var
  (defaults to `info`).
