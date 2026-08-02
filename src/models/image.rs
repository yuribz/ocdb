use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

/*
    Image as contained in the storage
*/
#[derive(Debug, Clone, FromRow)]
pub struct ImageRow {
    pub id: Uuid,
    pub object_key: String,
    pub content_type: String,
    pub caption: Option<String>,
    pub created_at: DateTime<Utc>,
    pub archived_at: Option<DateTime<Utc>>,
}

/*
    An instance of a link to an image
*/
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

/// `entity_type` tags used in `image_links.entity_type`. A plain string
/// column rather than a Postgres enum, so a future linkable entity (places,
/// items, events, ...) never requires a migration here — just a new
/// constant and a small nested route reusing `ImageService` as-is.
pub mod entity_type {
    pub const CHARACTER: &str = "character";
}
