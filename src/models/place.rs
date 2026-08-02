use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow)]
pub struct PlaceRow {
    pub id: Uuid,
    pub name: String,
    pub place_type: String,
    pub parent_location: Uuid,
    pub description: String,
    pub extra: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub mod entity_type {
    pub const CHARACTER: &str = "place";
}

