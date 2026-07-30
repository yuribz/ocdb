# Architecture

A living map of how ocdb's pieces fit together. This describes current
reality, not history — see `git log` for how it got here.

## Backend (`src/`, Rust / Axum / sqlx)

Layering: **routes → services → repositories → db**. Every route handler
constructs a service from `AppState`, calls one service method, and maps the
result to a response — no route talks to a repository directly.

- **`main.rs`** — wires config, DB pool + migrations, S3 storage, and the
  router together; serves `/api/*`, `/swagger-ui`, and falls back to
  `static/` for everything else.
- **`config.rs`** — loads `AppConfig` from env (via `dotenvy` in dev).
- **`db.rs`** — creates the sqlx `DbPool` and runs migrations on startup.
- **`state.rs`** — `AppState { db, storage }`, cloned into every handler.
- **`storage.rs`** — S3/MinIO client wrapper (`put_object`, `public_url`,
  `ensure_bucket`).
- **`error.rs`** — `AppError`, the single error type all handlers return;
  has a `Validation` variant used for request-shape problems.
- **`models/`** — `Character`, `Pronoun`, `Image`/`ArchivedImage`, plus
  `New*`/`Update*` DTOs deserialized straight from request bodies.
- **`repositories/`** — one file per aggregate (`character`, `pronoun`,
  `image`); own all SQL, using runtime `sqlx::query_as::<_, T>` (not the
  `query!` macros), so `cargo check` needs no live `DATABASE_URL`.
- **`services/`** — business logic between routes and repositories:
  - `CharacterService` — thin CRUD delegation to `CharacterRepository`,
    except `delete`, which also calls
    `ImageRepository::unlink_all_for_entity` first so a deleted character's
    images get archived instead of orphaned. This is the reference pattern
    for wiring up any future linkable entity type (places, items, events —
    see `routes/images.rs`'s header comment).
  - `PronounService` — thin CRUD delegation to `PronounRepository`.
  - `ImageService` — the one service with real logic: validates upload
    content-type/size, writes bytes to S3 via `Storage`, then persists the
    link via `ImageRepository`; also maps DB rows to `Image`/`ArchivedImage`
    by attaching a public URL. Unlinking is DB-only (soft-archive), no
    storage call.
- **`routes/`** — one file per resource (`characters`, `pronouns`, `images`,
  `health`), each exposing an axum `Router<AppState>` merged together in
  `routes/mod.rs`. `openapi.rs` holds the utoipa `ApiDoc` aggregating every
  handler's `#[utoipa::path]` annotations, served at `/swagger-ui`.
  - `/api/characters`, `/api/characters/{id}` — character CRUD.
  - `/api/pronouns`, `/api/pronouns/{id}`, nested
    `/api/characters/{id}/pronouns` (list only) — pronoun CRUD.
  - `/api/characters/{id}/images` (list/upload), `/api/image-links/{id}`
    (get/update/delete), `/api/images/archived` (list) — image catalog.
    Restoring an archived image isn't implemented yet (see repo's
    `docs/crates.md`/history for context).
  - `/api/health` — liveness check for Docker healthchecks.

## Frontend (`static/`, vanilla JS, no build step, no framework)

`static/index.html` loads `theme.js` (classic script) and `app.js`
(`type="module"`, pulls in everything else via ES imports).

- **`app.js`** — entry point: calls `loadCharacters()` and imports
  `character_entity.js` for its side effects (wiring up the modal's own
  event listeners).
- **`api.js`** — one `fetch` wrapper (`request`) plus `createEntityClient`,
  a factory for uniform CRUD-by-id resources; instantiated once as
  `characters`. `pronouns` and `images` are hand-written clients (their
  routes aren't uniformly nested). Exports `errorMessageFrom(response,
  fallback)`, the shared helper for pulling `{ error }` out of a failed
  response body — used by both `modal.js` and `character_entity.js` so that
  logic lives in one place.
- **`entity_schemas.js`** — `characterSchema`: the single source of truth
  for a character's fields (view rendering, form generation, and
  create/update payload shape all derive from this one field list).
- **`modal.js`** — `createEntityModal({ element, schema, client, onSaved })`,
  a generic view/edit/create controller driven entirely by a schema; knows
  nothing about entity-specific extras like image galleries or pronoun
  lists. `initModal` handles the low-level open/close/CSS-class mechanics.
- **`character_entity.js`** — wires `createEntityModal` up for characters
  specifically: renders pronouns and the image gallery/cover into the modal
  (data `createEntityModal` doesn't know about), and handles the upload
  form. Exports `openCharacterModal(id)` / `openNewCharacterModal()`, called
  from `character_list.js`'s click handlers and the "new character" button.
- **`character_list.js`** — fetches and renders the character list,
  wiring each entry's click to `openCharacterModal`.
- **`theme.js`** — light/dark/auto theme toggle backed by `localStorage`,
  independent of everything else.

Call flow: `character_list.js` / `character_entity.js` → `api.js` →
`/api/*` routes → services → repositories → Postgres (and, for images,
`storage.rs` → S3/MinIO).

## Layering notes

No violations found as of this pass — every route goes through a service,
every service that touches SQL goes through a repository, and the two
"real logic" services (`CharacterService::delete`'s cascade-archive,
`ImageService`'s upload validation/storage orchestration) are the only
non-trivial ones. `PronounService` and most of `CharacterService` are still
thin pass-throughs; that's expected until pronoun-specific validation
(e.g. "exactly one primary pronoun set") lands.
