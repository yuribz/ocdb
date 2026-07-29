//! The `Character` model: an original character sheet.

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

/// A character as stored in the database.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Character {
    pub id: Uuid,
    pub name: String,
    pub age: i32,
    pub birthday: Option<NaiveDate>,
    /// Free-form so custom / non-binary identities aren't boxed into an enum.
    pub gender: String,
    /// Free-form for the same reason as `gender`.
    pub sexuality: String,
    pub nationality: Option<String>,
    /// Open-ended bag of custom fields, so the sheet can grow without a migration.
    pub extra: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Payload for creating a new character.
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct NewCharacter {
    pub name: String,
    pub age: i32,
    pub birthday: Option<NaiveDate>,
    pub gender: String,
    pub sexuality: String,
    pub nationality: Option<String>,
    pub extra: Option<serde_json::Value>,
}

/// Payload for partially updating an existing character.
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateCharacter {
    pub name: Option<String>,
    pub age: Option<i32>,
    pub birthday: Option<NaiveDate>,
    pub gender: Option<String>,
    pub sexuality: Option<String>,
    pub nationality: Option<String>,
    pub extra: Option<serde_json::Value>,
}
