# Architecture

A living map of how ocdb's pieces fit together. This describes current
reality, not history — see `git log` for how it got here.

## Backend (`src/`, Rust / Axum / sqlx)

Layering: **routes → services → repositories → db**, for every entity that
has all three layers wired up (characters, pronouns, images). Every such
route handler constructs a service from `AppState`, calls one service method,
and maps the result to a response — no route talks to a repository directly.
Places (see below) does not have routes or services yet, so this rule has
nothing to violate for it — it just isn't reachable from HTTP at all.

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
  - **`place.rs`** (in progress, on `add-places-entity`) — a bare `Place`
    struct: `id`, `name`, `place_type`, `parent_location: Uuid`,
    `description`, `extra`, `created_at`/`updated_at`. Missing `#[derive(...)]`
    (no `FromRow`/`Serialize`/`ToSchema` wired up yet, though the imports are
    there) and no `NewPlace`/`UpdatePlace` DTOs. `parent_location` is
    currently a required `Uuid`; the intent (per the frontend's "None
    (top-level)" option, already built ahead of this) is for it to become
    `Option<Uuid>` so top-level places are allowed — not done yet.
- **`repositories/`** — one file per aggregate (`character`, `pronoun`,
  `image`); own all SQL, using runtime `sqlx::query_as::<_, T>` (not the
  `query!` macros), so `cargo check` needs no live `DATABASE_URL`.
  - **`base.rs`** (in progress) — a new generic abstraction: `Table` (names
    the SQL table), `Insertable`/`Updatable` (push bind values / `COALESCE`
    set-clauses into a `sqlx::QueryBuilder`), and a `BaseRepository` trait
    (`create`/`get_by_id`/`list`/`update`/`delete`/`bulk_create`/
    `bulk_update`) meant to let future repositories get CRUD "for free" from
    a query-builder instead of hand-rolling SQL per aggregate. Not
    implemented by `character`/`pronoun`/`image`/`place` yet — purely
    scaffolding, `mod base` is even private (`mod base;`, not `pub mod`).
  - **`place.rs`** — just `pub struct PlaceRepository<'a> { pool: &'a DbPool }`,
    no methods, doesn't implement `Table`/`BaseRepository`. Not usable yet.
- **`services/`** — business logic between routes and repositories:
  - `CharacterService` — thin CRUD delegation to `CharacterRepository`,
    except `delete`, which also calls
    `ImageRepository::unlink_all_for_entity` first so a deleted character's
    images get archived instead of orphaned. This is the reference pattern
    for wiring up any future linkable entity type (places, items, events —
    see `routes/images.rs`'s header comment).
  - `PronounService` — thin CRUD delegation to `PronounRepository`; does
    **not** enforce "exactly one primary pronoun set per character" (see
    Layering notes below — the new pronoun-editing UI surfaces this gap
    directly instead of working around it).
  - `ImageService` — the one service with real logic: validates upload
    content-type/size, writes bytes to S3 via `Storage`, then persists the
    link via `ImageRepository`; also maps DB rows to `Image`/`ArchivedImage`
    by attaching a public URL. Unlinking is DB-only (soft-archive), no
    storage call.
  - No `PlaceService` exists yet.
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
  - No `routes/place.rs` and no `places` migration exist. **`/api/places`
    does not exist on the backend at all** — see Layering notes for the
    frontend implication.

## Frontend (`static/`, vanilla JS, no build step, no framework)

`static/index.html` loads `theme.js` (classic script) and `app.js`
(`type="module"`, pulls in everything else via ES imports). The page has two
top-level sections, `#characters` and `#places`, each with its own list and
"+ New" button, and two modal shells, `#character-modal` and `#place-modal`
(both view/edit/create via `createEntityModal`; `#place-modal` omits the
cover-image/gallery markup `#character-modal` has, since Places has no
image-linking backend).

Every file under `static/js/` starts with `// @ts-check` and carries JSDoc
`@param`/`@returns`/`@typedef` annotations (`EntityClient`, `Schema`, `Field`,
`ModalController`, `EntityModalController`, etc.). `jsconfig.json` +
`package.json`'s `npm run typecheck` (`tsc --noEmit -p jsconfig.json`) type-
checks all of `static/js/**/*.js` against those annotations; it currently
passes clean. Any new frontend JS in this repo should follow this convention.

- **`app.js`** — entry point: calls `loadCharacters()` and `loadPlaces()`,
  and imports `character_entity.js`/`place_entity.js` for their side effects
  (wiring up each modal's own event listeners).
- **`api.js`** — one `fetch` wrapper (`request`) plus `createEntityClient`,
  a factory for uniform CRUD-by-id resources; instantiated as `characters`
  and `places` (`places` hits `/api/places`, which 404s until the backend
  work above lands). `pronouns` and `images` are hand-written clients (their
  routes aren't uniformly nested); `pronouns` now has full `create`/
  `update`/`remove` (previously read-only, just `listForCharacter`). Exports
  `errorMessageFrom(response, fallback)`, the shared helper for pulling
  `{ error }` out of a failed response body — used by `modal.js` and
  `character_entity.js`.
- **`entity_schemas.js`** — `characterSchema` and `placesSchema`: the single
  source of truth for an entity's fields (view rendering, form generation,
  and create/update payload shape all derive from one field list).
  `placesSchema` covers `name`, `place_type`, `parent_location` (a `select`
  field — the first schema field to use that type), and `description`;
  `extra` is intentionally omitted (no backend DTO support for it yet).
  `parent_location`'s options are resolved live via an async function that
  calls `places.list()` and prepends a "None (top-level)" choice — this will
  itself fail (empty option list) until `/api/places` exists.
- **`modal.js`** — `createEntityModal({ element, schema, client, onSaved })`,
  a generic view/edit/create controller driven entirely by a schema; knows
  nothing about entity-specific extras like image galleries or pronoun
  lists. `renderForm` supports `field.type === "select"`, rendering a
  `<select>` whose options come from `field.options` — either a plain array
  or an async function (as used by `parent_location` above). Because option
  resolution can be async, `renderForm`/`openCreate`/`enterEdit` are all
  `async` now. `initModal` handles the low-level open/close/CSS-class
  mechanics.
- **`character_entity.js`** — wires `createEntityModal` up for characters
  specifically: renders the image gallery/cover into the modal, and now also
  gives pronouns full CRUD (add/edit/delete a pronoun set, mark one
  primary) via an inline `<form>` in `.modal-pronouns-section` (same
  hidden-until-toggled pattern as the upload form) — this replaces the old
  read-only `renderPronounsIntoView`. A code comment on `setPronounPrimary`
  flags that the backend doesn't enforce single-primary (see Layering
  notes). Exports `openCharacterModal(id)` / `openNewCharacterModal()`,
  called from `character_list.js`'s click handlers and the "new character"
  button.
- **`character_list.js`** — fetches and renders the character list,
  wiring each entry's click to `openCharacterModal`.
- **`place_entity.js`** — mirrors `character_entity.js` for places: wires
  `createEntityModal` with `placesSchema`/`places` client, no gallery layer
  (Places has no image-linking backend). Exports `openPlaceModal(id)` /
  `openNewPlaceModal()`.
- **`place_list.js`** — mirrors `character_list.js`: fetches and renders the
  place list, wiring each entry's click to `openPlaceModal`. `loadPlaces()`
  catches fetch failures silently and just leaves the list empty, since
  `/api/places` doesn't exist yet and this runs unconditionally on every
  page load via `app.js`.
- **`theme.js`** — light/dark/auto theme toggle backed by `localStorage`,
  independent of everything else.

Call flow: `character_list.js` / `character_entity.js` → `api.js` →
`/api/*` routes → services → repositories → Postgres (and, for images,
`storage.rs` → S3/MinIO). `place_list.js` / `place_entity.js` follow the same
shape on paper (→ `api.js`'s `places` client → `/api/places`) but currently
dead-end at the fetch, since nothing on the backend answers that route yet.

## Layering notes

- Backend layering (routes → services → repositories) has no violations for
  the entities that are actually wired up end-to-end (characters, pronouns,
  images). `PronounService` and most of `CharacterService` are still thin
  pass-throughs; that's expected until pronoun-specific validation (e.g.
  "exactly one primary pronoun set") lands. **The frontend's new pronoun UI
  (`character_entity.js`'s "Set primary" button) surfaces this exact gap
  live** — it can leave multiple pronoun sets marked primary per character,
  by design (not faked around client-side), until `PronounService` grows
  that rule.
- Places is mid-migration and not a layering violation so much as an
  incomplete stack: `models/place.rs` and `repositories/place.rs` exist but
  are inert (no derives/DTOs, no methods, don't implement the new
  `repositories/base.rs` traits), and there is no `services/place.rs`,
  `routes/place.rs`, or `places` migration at all. Nothing routes through a
  repository directly for Places — there's simply no route to do so from.
- The frontend is ahead of the backend here: `static/js/api.js`'s `places`
  client, `entity_schemas.js`'s `placesSchema`, `place_list.js`, and
  `place_entity.js` all call/reference `/api/places`, which currently 404s.
  This is intentional scaffolding (both `api.js` and `entity_schemas.js`
  carry comments to that effect) rather than a bug, but it means
  `place_list.js`'s `loadPlaces()` — called unconditionally from `app.js` on
  every page load — currently always fails and silently no-ops.
