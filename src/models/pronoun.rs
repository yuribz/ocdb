//! The `Pronoun` model: one pronoun set belonging to a `Character`.
//!
//! A character can have several pronoun sets (e.g. she/her and they/them),
//! so this is a separate table rather than columns on `characters`.

use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

/// A single pronoun set as stored in the database.
#[derive(Debug, Clone, FromRow)]
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
