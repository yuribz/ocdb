//! The image catalog. `ImageRow` mirrors the `images` table exactly and is
//! internal to the repository/service layers. `LinkedImageRow` is a joined
//! `images` + `image_links` row — what "images belonging to entity X"
//! queries return. `Image` is the API-facing shape for a linked image
//! (computed `url`); `ArchivedImage` is the API-facing shape for a
//! catalog-wide archived listing.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow)]
pub struct ImageRow {
    pub id: Uuid,
    pub object_key: String,
    pub content_type: String,
    pub caption: Option<String>,
    pub created_at: DateTime<Utc>,
    pub archived_at: Option<DateTime<Utc>>,
}

/// One image as attached to a specific entity (a joined `images` +
/// `image_links` row). `link_id` identifies the *attachment*, not the
/// image itself — updating/unlinking operate on `link_id`.
#[derive(Debug, Clone, FromRow)]
pub struct LinkedImageRow {
    pub link_id: Uuid,
    pub image_id: Uuid,
    pub object_key: String,
    pub content_type: String,
    pub caption: Option<String>,
    pub is_primary: bool,
    pub linked_at: DateTime<Utc>,
}

/// API-facing representation of a linked image, with a computed,
/// directly-servable `url`.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct Image {
    pub link_id: Uuid,
    pub image_id: Uuid,
    pub caption: Option<String>,
    pub is_primary: bool,
    pub linked_at: DateTime<Utc>,
    pub url: String,
}

impl Image {
    pub fn from_linked_row(row: LinkedImageRow, url: String) -> Self {
        Self {
            link_id: row.link_id,
            image_id: row.image_id,
            caption: row.caption,
            is_primary: row.is_primary,
            linked_at: row.linked_at,
            url,
        }
    }
}

/// API-facing representation of an archived (soft-deleted) catalog image.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ArchivedImage {
    pub id: Uuid,
    pub caption: Option<String>,
    pub created_at: DateTime<Utc>,
    pub archived_at: DateTime<Utc>,
    pub url: String,
}

impl ArchivedImage {
    pub fn from_row(row: ImageRow, url: String) -> Self {
        Self {
            id: row.id,
            caption: row.caption,
            created_at: row.created_at,
            archived_at: row
                .archived_at
                .expect("list_archived only returns rows with archived_at set"),
            url,
        }
    }
}

/// Documents the multipart/form-data shape in the OpenAPI schema only —
/// the upload handler parses `axum::extract::Multipart` fields directly.
#[derive(Debug, Deserialize, ToSchema)]
pub struct ImageUpload {
    #[schema(format = Binary, content_media_type = "application/octet-stream")]
    pub file: Vec<u8>,
    pub caption: Option<String>,
    pub is_primary: Option<bool>,
}

/// Payload for updating a link's caption (stored on the image) and/or
/// primary flag (stored on the link).
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateImageLink {
    pub caption: Option<String>,
    pub is_primary: Option<bool>,
}

/// `entity_type` tags used in `image_links.entity_type`. A plain string
/// column rather than a Postgres enum, so a future linkable entity (places,
/// items, events, ...) never requires a migration here — just a new
/// constant and a small nested route reusing `ImageService` as-is.
pub mod entity_type {
    pub const CHARACTER: &str = "character";
}
