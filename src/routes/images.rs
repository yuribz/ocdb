//! Image catalog endpoints. Upload/list are exposed as a nested resource
//! under /characters/{character_id}/images for convenience (today's only
//! linkable entity type); a future entity type (places, items, events,
//! ...) would get its own nested route calling the same ImageService with
//! a different entity_type — no change to the image catalog itself.
//! Everything else operates on the image_links resource directly.

use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Multipart, Path, State},
    http::StatusCode,
    routing::get,
};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::image::{ArchivedImage, Image, ImageUpload, UpdateImageLink, entity_type};
use crate::services::image::ImageService;
use crate::state::AppState;

/// axum's Multipart extractor defaults to a 2MB body limit; raise it for
/// image uploads. A plain constant is enough for a personal-use app.
const MAX_UPLOAD_BYTES: usize = 20 * 1024 * 1024;

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/characters/{character_id}/images",
            get(list_images_for_character).post(upload_image_for_character),
        )
        .route(
            "/image-links/{link_id}",
            get(get_image_link).put(update_image_link).delete(delete_image_link),
        )
        .route("/images/archived", get(list_archived_images))
        .layer(DefaultBodyLimit::max(MAX_UPLOAD_BYTES))
}

#[utoipa::path(
    get,
    path = "/api/characters/{character_id}/images",
    tag = "images",
    params(("character_id" = Uuid, Path, description = "Character id")),
    responses((status = 200, description = "List images linked to a character", body = [Image])),
)]
pub(crate) async fn list_images_for_character(
    State(state): State<AppState>,
    Path(character_id): Path<Uuid>,
) -> Result<Json<Vec<Image>>, AppError> {
    let service = ImageService::new(&state.db, &state.storage);
    let images = service.list_for_entity(entity_type::CHARACTER, character_id).await?;
    Ok(Json(images))
}

#[utoipa::path(
    post,
    path = "/api/characters/{character_id}/images",
    tag = "images",
    params(("character_id" = Uuid, Path, description = "Character id")),
    request_body(content = ImageUpload, content_type = "multipart/form-data"),
    responses((status = 200, description = "Image uploaded and linked to the character", body = Image)),
)]
pub(crate) async fn upload_image_for_character(
    State(state): State<AppState>,
    Path(character_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<Image>, AppError> {
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut content_type: Option<String> = None;
    let mut caption: Option<String> = None;
    let mut is_primary: Option<bool> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|err| AppError::Validation(format!("invalid multipart body: {err}")))?
    {
        let name = field.name().unwrap_or_default().to_string();
        match name.as_str() {
            "file" => {
                content_type = field.content_type().map(str::to_string);
                let data = field
                    .bytes()
                    .await
                    .map_err(|err| AppError::Validation(format!("failed to read file field: {err}")))?;
                file_bytes = Some(data.to_vec());
            }
            "caption" => {
                let text = field
                    .text()
                    .await
                    .map_err(|err| AppError::Validation(format!("failed to read caption field: {err}")))?;
                caption = if text.is_empty() { None } else { Some(text) };
            }
            "is_primary" => {
                let text = field
                    .text()
                    .await
                    .map_err(|err| AppError::Validation(format!("failed to read is_primary field: {err}")))?;
                is_primary = text.parse::<bool>().ok();
            }
            _ => {}
        }
    }

    let bytes = file_bytes.ok_or_else(|| AppError::Validation("missing 'file' field".to_string()))?;

    let service = ImageService::new(&state.db, &state.storage);
    let image = service
        .upload(entity_type::CHARACTER, character_id, content_type.as_deref(), bytes, caption, is_primary)
        .await?;
    Ok(Json(image))
}

#[utoipa::path(
    get,
    path = "/api/image-links/{link_id}",
    tag = "images",
    params(("link_id" = Uuid, Path, description = "Image-link id")),
    responses(
        (status = 200, description = "Linked image found", body = Image),
        (status = 404, description = "Not found"),
    ),
)]
pub(crate) async fn get_image_link(
    State(state): State<AppState>,
    Path(link_id): Path<Uuid>,
) -> Result<Json<Image>, AppError> {
    let service = ImageService::new(&state.db, &state.storage);
    let image = service.get_link(link_id).await?.ok_or(AppError::NotFound)?;
    Ok(Json(image))
}

#[utoipa::path(
    put,
    path = "/api/image-links/{link_id}",
    tag = "images",
    params(("link_id" = Uuid, Path, description = "Image-link id")),
    request_body = UpdateImageLink,
    responses(
        (status = 200, description = "Caption and/or primary flag updated", body = Image),
        (status = 404, description = "Not found"),
    ),
)]
pub(crate) async fn update_image_link(
    State(state): State<AppState>,
    Path(link_id): Path<Uuid>,
    Json(payload): Json<UpdateImageLink>,
) -> Result<Json<Image>, AppError> {
    let service = ImageService::new(&state.db, &state.storage);
    let image = service
        .update_link(link_id, payload.caption, payload.is_primary)
        .await?
        .ok_or(AppError::NotFound)?;
    Ok(Json(image))
}

#[utoipa::path(
    delete,
    path = "/api/image-links/{link_id}",
    tag = "images",
    params(("link_id" = Uuid, Path, description = "Image-link id")),
    responses(
        (status = 204, description = "Unlinked (and archived if this was the image's last link)"),
        (status = 404, description = "Not found"),
    ),
)]
pub(crate) async fn delete_image_link(
    State(state): State<AppState>,
    Path(link_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let service = ImageService::new(&state.db, &state.storage);
    if service.unlink(link_id).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError::NotFound)
    }
}

#[utoipa::path(
    get,
    path = "/api/images/archived",
    tag = "images",
    responses((status = 200, description = "List archived catalog images", body = [ArchivedImage])),
)]
pub(crate) async fn list_archived_images(
    State(state): State<AppState>,
) -> Result<Json<Vec<ArchivedImage>>, AppError> {
    let service = ImageService::new(&state.db, &state.storage);
    let images = service.list_archived().await?;
    Ok(Json(images))
}
