//! Liveness check, useful for Docker healthchecks.

use axum::{Json, Router, routing::get};
use serde_json::{Value, json};

use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/health", get(health))
}

#[utoipa::path(
    get,
    path = "/api/health",
    tag = "health",
    responses((status = 200, description = "Service is healthy", body = Value)),
)]
pub(crate) async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}
