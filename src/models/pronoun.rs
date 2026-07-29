//! The `Pronoun` model: one pronoun set belonging to a `Character`.
//!
//! A character can have several pronoun sets (e.g. she/her and they/them),
//! so this is a separate table rather than columns on `characters`.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

/// A single pronoun set as stored in the database.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Pronoun {
    pub id: Uuid,
    pub character_id: Uuid,
    /// e.g. "she"
    pub subject: String,
    /// e.g. "her"
    pub object: String,
    /// e.g. "hers"
    pub possessive: String,
    /// e.g. "her" (as in "her book")
    pub possessive_determiner: String,
    /// e.g. "herself"
    pub reflexive: String,
    /// Marks the preferred set among several for the same character.
    pub is_primary: bool,
    pub created_at: DateTime<Utc>,
}

/// Payload for adding a new pronoun set to a character.
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct NewPronoun {
    pub character_id: Uuid,
    pub subject: String,
    pub object: String,
    pub possessive: String,
    pub possessive_determiner: String,
    pub reflexive: String,
    pub is_primary: Option<bool>,
}

/// Payload for partially updating an existing pronoun set.
#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdatePronoun {
    pub subject: Option<String>,
    pub object: Option<String>,
    pub possessive: Option<String>,
    pub possessive_determiner: Option<String>,
    pub reflexive: Option<String>,
    pub is_primary: Option<bool>,
}
