//! `/pronouns` endpoints, plus a nested listing under `/characters/{id}/pronouns`.

use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::pronoun::{NewPronoun, Pronoun, UpdatePronoun};
use crate::services::pronoun::PronounService;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/pronouns", post(create_pronoun))
        .route(
            "/pronouns/{id}",
            get(get_pronoun).put(update_pronoun).delete(delete_pronoun),
        )
        .route(
            "/characters/{character_id}/pronouns",
            get(list_pronouns_for_character),
        )
}

#[utoipa::path(
    get,
    path = "/api/characters/{character_id}/pronouns",
    tag = "pronouns",
    params(("character_id" = Uuid, Path, description = "Character id")),
    responses((status = 200, description = "List pronoun sets for a character", body = [Pronoun])),
)]
pub(crate) async fn list_pronouns_for_character(
    State(state): State<AppState>,
    Path(character_id): Path<Uuid>,
) -> Result<Json<Vec<Pronoun>>, AppError> {
    let service = PronounService::new(&state.db);
    let pronouns = service.list_for_character(character_id).await?;
    Ok(Json(pronouns))
}

#[utoipa::path(
    post,
    path = "/api/pronouns",
    tag = "pronouns",
    request_body = NewPronoun,
    responses((status = 200, description = "Pronoun set created", body = Pronoun)),
)]
pub(crate) async fn create_pronoun(
    State(state): State<AppState>,
    Json(payload): Json<NewPronoun>,
) -> Result<Json<Pronoun>, AppError> {
    let service = PronounService::new(&state.db);
    let pronoun = service.create(payload).await?;
    Ok(Json(pronoun))
}

#[utoipa::path(
    get,
    path = "/api/pronouns/{id}",
    tag = "pronouns",
    params(("id" = Uuid, Path, description = "Pronoun id")),
    responses(
        (status = 200, description = "Pronoun set found", body = Pronoun),
        (status = 404, description = "Pronoun set not found"),
    ),
)]
pub(crate) async fn get_pronoun(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Pronoun>, AppError> {
    let service = PronounService::new(&state.db);
    let pronoun = service.get_by_id(id).await?.ok_or(AppError::NotFound)?;
    Ok(Json(pronoun))
}

#[utoipa::path(
    put,
    path = "/api/pronouns/{id}",
    tag = "pronouns",
    params(("id" = Uuid, Path, description = "Pronoun id")),
    request_body = UpdatePronoun,
    responses(
        (status = 200, description = "Pronoun set updated", body = Pronoun),
        (status = 404, description = "Pronoun set not found"),
    ),
)]
pub(crate) async fn update_pronoun(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdatePronoun>,
) -> Result<Json<Pronoun>, AppError> {
    let service = PronounService::new(&state.db);
    let pronoun = service.update(id, payload).await?.ok_or(AppError::NotFound)?;
    Ok(Json(pronoun))
}

#[utoipa::path(
    delete,
    path = "/api/pronouns/{id}",
    tag = "pronouns",
    params(("id" = Uuid, Path, description = "Pronoun id")),
    responses(
        (status = 204, description = "Pronoun set deleted"),
        (status = 404, description = "Pronoun set not found"),
    ),
)]
pub(crate) async fn delete_pronoun(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let service = PronounService::new(&state.db);
    if service.delete(id).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError::NotFound)
    }
}
