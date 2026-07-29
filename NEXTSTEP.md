# Next steps

What exists right now: a compiling axum + sqlx skeleton with working CRUD
repositories for `Character` and `Pronoun`, routes that call those
repositories directly, empty service-layer files, a Postgres schema, a
static HTML/CSS/JS frontend stub, and a Dockerfile + compose file. Nothing
has been run against a live database yet — `cargo check` passes, but the
CRUD paths are untested.

## Before you start layering on features

1. **Run it once.** `docker compose up --build`, or `cp .env.example .env`
   and `cargo run` against a local Postgres. Hit `GET /api/health`, then
   `POST /api/characters`, then `GET /api/characters`. This is the fastest
   way to catch anything I got wrong in the schema/repository/route wiring.
2. **Decide what goes in the empty `services/*.rs` files.** Right now
   routes call repositories directly, which is fine for plain CRUD but
   wrong the moment you need cross-cutting logic. Candidates for the
   service layer:
   - Validation (age ranges, non-empty pronoun strings, at least one
     `is_primary` pronoun per character, etc.) — `AppError::Validation`
     already exists and is wired into the HTTP layer, just unused so far.
   - Enforcing "exactly one primary pronoun set" when creating/updating
     pronouns (currently the DB allows zero or many).
   - Any derived/computed fields you want on `Character` before it's
     serialized.
3. **Write tests** before the routes multiply. `sqlx::test` (behind the
   `test-integration` sqlx feature, add it when you get here) auto-manages
   a scratch database per test and runs your migrations — the natural
   choice given the repository layer already isolates SQL from HTTP.

## Things I deliberately punted on

- **Auth.** There's no login, no session, no API key check. Since this is
  a personal single-user database, decide up front whether you actually
  want auth or whether "don't expose the port publicly" is good enough —
  don't build it speculatively.
- **Pagination.** `list()` and `list_for_character()` return everything.
  Fine at OC-collection scale; revisit if it ever isn't.
- **Frontend.** `static/` is a placeholder that fetches and lists character
  names — there's no create/edit form, no pronoun UI, no styling to speak
  of. This is the biggest gap between "backend skeleton" and "usable app."
- **The `extra` JSONB column** on `Character` is the "room for growth" field
  from the requirements — arbitrary custom fields without a migration. It's
  currently opaque `serde_json::Value` with no shape enforcement. Worth
  deciding later whether specific recurring custom fields (species,
  occupation, relationships, whatever comes up) deserve to graduate into
  real columns.
- **sqlx offline mode.** The repositories use the runtime `query_as::<_, T>`
  API specifically so the project builds without a live database — no
  `DATABASE_URL` needed at compile time, no `.sqlx` query cache to keep in
  sync. If you switch to the `query!`/`query_as!` macros later for
  compile-time SQL checking, you'll need `cargo sqlx prepare` and a
  `.sqlx` directory checked in (or built) for Docker builds to keep working
  without DB access at build time.
- **Cargo.lock** isn't committed yet — first `cargo build` will generate
  it. Commit it once you've run it, so Docker builds are reproducible.

## Image catalog follow-ups

- **Restoring an archived image isn't implemented.** `GET
  /api/images/archived` is read-only — an image that lost its last link
  (explicit delete, or its owning character got deleted) stays archived
  forever unless you re-link it by hand (e.g. `INSERT INTO image_links
  ...` directly). A "restore" endpoint that re-links an archived image to
  an entity would be a natural addition if this comes up.
- **No retention/purge policy for archived images.** Their object bytes in
  MinIO/S3 are never deleted by the app, so storage usage only grows.
  Fine for a personal collection; revisit if it ever isn't.
- **Adding a new linkable entity type** (places, items, events, ...) is
  meant to be cheap: add a constant to `models::image::entity_type`, add a
  small nested `/{entity}/{id}/images` route calling the existing
  `ImageService` unchanged, and call
  `image_repo.unlink_all_for_entity(...)` from that entity's own delete
  path (see `services::character::CharacterService::delete` for the
  pattern). No changes to the image catalog itself should be needed.

## Backups

- Automated via the `backup` compose service — see `docs/BACKUPS.md`.
  Remember to actually copy `./backups/` off this machine periodically;
  nothing here does that for you.

## Smaller polish items

- `docker-compose.yml` bakes `ocdb`/`ocdb` as the Postgres credentials.
  Fine for local dev; swap for secrets/env injection before this touches
  anything shared.
- No `rustfmt.toml`/`clippy` CI step exists yet. Worth adding once the
  shape of the code stabilizes, so you're not fighting formatting churn on
  every file created above.
