//! `/characters` endpoints.

use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::get,
};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::character::{Character, NewCharacter, UpdateCharacter};
use crate::services::character::CharacterService;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/characters", get(list_characters).post(create_character))
        .route(
            "/characters/{id}",
            get(get_character)
                .put(update_character)
                .delete(delete_character),
        )
}

#[utoipa::path(
    get,
    path = "/api/characters",
    tag = "characters",
    responses((status = 200, description = "List all characters", body = [Character])),
)]
pub(crate) async fn list_characters(
    State(state): State<AppState>,
) -> Result<Json<Vec<Character>>, AppError> {
    let service = CharacterService::new(&state.db);
    let characters = service.list().await?;
    Ok(Json(characters))
}

#[utoipa::path(
    post,
    path = "/api/characters",
    tag = "characters",
    request_body = NewCharacter,
    responses((status = 200, description = "Character created", body = Character)),
)]
pub(crate) async fn create_character(
    State(state): State<AppState>,
    Json(payload): Json<NewCharacter>,
) -> Result<Json<Character>, AppError> {
    let service = CharacterService::new(&state.db);
    let character = service.create(payload).await?;
    Ok(Json(character))
}

#[utoipa::path(
    get,
    path = "/api/characters/{id}",
    tag = "characters",
    params(("id" = Uuid, Path, description = "Character id")),
    responses(
        (status = 200, description = "Character found", body = Character),
        (status = 404, description = "Character not found"),
    ),
)]
pub(crate) async fn get_character(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Character>, AppError> {
    let service = CharacterService::new(&state.db);
    let character = service.get_by_id(id).await?.ok_or(AppError::NotFound)?;
    Ok(Json(character))
}

#[utoipa::path(
    put,
    path = "/api/characters/{id}",
    tag = "characters",
    params(("id" = Uuid, Path, description = "Character id")),
    request_body = UpdateCharacter,
    responses(
        (status = 200, description = "Character updated", body = Character),
        (status = 404, description = "Character not found"),
    ),
)]
pub(crate) async fn update_character(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateCharacter>,
) -> Result<Json<Character>, AppError> {
    let service = CharacterService::new(&state.db);
    let character = service
        .update(id, payload)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(character))
}

#[utoipa::path(
    delete,
    path = "/api/characters/{id}",
    tag = "characters",
    params(("id" = Uuid, Path, description = "Character id")),
    responses(
        (status = 204, description = "Character deleted"),
        (status = 404, description = "Character not found"),
    ),
)]
pub(crate) async fn delete_character(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let service = CharacterService::new(&state.db);
    if service.delete(id).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError::NotFound)
    }
}
