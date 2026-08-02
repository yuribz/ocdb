//! The `Character` model: an original character sheet.

use chrono::{DateTime, NaiveDate, Utc};
use sqlx::FromRow;
use uuid::Uuid;

/*
    Character in db.
*/
#[derive(Debug, Clone, FromRow)]
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
