//! HTTP route wiring, mounted under `/api` by `main.rs`.

pub mod characters;
pub mod health;
pub mod images;
pub mod openapi;
pub mod pronouns;

use axum::Router;

use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .merge(health::router())
        .merge(characters::router())
        .merge(pronouns::router())
        .merge(images::router())
}
