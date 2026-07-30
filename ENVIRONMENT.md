# Environment

Snapshot of what's installed and pinned in this dev environment. Check here
before running `cargo add`, `cargo install`, `npm install`, etc. — if it's
listed below, it's already present and doesn't need to be fetched again.

Regenerate the version numbers with the commands noted in each section if
this file goes stale; don't hand-edit version numbers without re-checking.

## Toolchains

| Tool | Version | Check with |
|---|---|---|
| Rust / rustc | 1.96.0 | `rustc --version` |
| Cargo | 1.96.0 | `cargo --version` |
| Node.js | v22.5.1 | `node --version` |
| npm | 10.8.2 | `npm --version` |

Edition in `Cargo.toml` is `2024`.

## Rust dependencies (Cargo.toml)

All present in `Cargo.lock` — no `cargo add` needed unless a new capability
is required. See `docs/crates.md` for what each crate is used for.

| Crate | Version spec | Features |
|---|---|---|
| axum | 0.8 | multipart |
| tokio | 1 | full |
| sqlx | 0.8 | runtime-tokio-rustls, postgres, uuid, chrono, migrate, json |
| serde | 1 | derive |
| serde_json | 1 | — |
| uuid | 1 | v4, serde |
| chrono | 0.4 | serde |
| tower | 0.5 | — |
| tower-http | 0.6 | fs, trace |
| tracing | 0.1 | — |
| tracing-subscriber | 0.3 | env-filter |
| dotenvy | 0.15 | — |
| thiserror | 2 | — |
| anyhow | 1 | — |
| utoipa | 5 | axum_extras, uuid, chrono |
| utoipa-swagger-ui | 9 | axum |
| aws-config | 1.10 | — |
| aws-sdk-s3 | 1.140 | — |

No `[dev-dependencies]` currently.

## Node / frontend tooling (package.json)

The frontend itself (`static/js/*.js`) is plain vanilla JS with no bundler,
framework, or runtime npm dependencies — Node is only used for typechecking
via JSDoc + `jsconfig.json`.

| Package | Version | Purpose |
|---|---|---|
| typescript | 5.9.3 (satisfies `^5.6.2`) | `npm run typecheck` runs `tsc --noEmit` against `jsconfig.json` for JSDoc-based type checking of `static/js/` |

No other npm packages are installed and none are needed unless the frontend
gains a build step.

## Infrastructure (docker-compose.yml)

Not npm/cargo packages, but pinned images — don't `docker pull` a different
tag without updating `docker-compose.yml`:

| Service | Image |
|---|---|
| db | postgres:16-alpine |
| minio | minio/minio:RELEASE.2025-09-07T16-13-09Z |
| backup | built from `./scripts` |
| app | built from `./Dockerfile` (`rust:1-slim-bookworm` builder → `debian:bookworm-slim` runtime) |

## What does NOT need to be reinstalled/updated

- Rust toolchain and all crates in `Cargo.toml`/`Cargo.lock` — already
  vendored and building. Only touch via `cargo add`/`cargo update` when a
  new feature genuinely requires it.
- `typescript` devDependency — already satisfies the `^5.6.2` range in
  `package.json`; no need to `npm install` again unless `node_modules/` is
  missing.
- Postgres and MinIO — run via `docker-compose up`, not installed locally.

## Updating this file

When dependencies actually change (a new crate is added, TypeScript is
bumped, a docker image tag changes), update the relevant table here in the
same commit as the dependency change.
