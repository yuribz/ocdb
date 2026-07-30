use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

pub struct Place {
    pub id: Uuid,
    pub name: String,
    pub place_type: String,
    pub parent_location: Uuid,
    pub description: String,
    pub extra: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

