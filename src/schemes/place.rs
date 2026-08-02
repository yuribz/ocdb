use uuid::Uuid;
use crate::models::character::Character;
use serde::Serialize;
use utoipa::ToSchema;
use chrono::{NaiveDate, DateTime, Utc};

pub struct NewCharacter {

}

pub struct UpdateCharacter {

}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct CharacterResponse {
    pub id: Uuid,
    pub name: String,
    pub age: i32,
    pub birthday: Option<NaiveDate>,
    pub gender: String,
    pub sexuality: String,
    pub nationality: Option<String>,
    pub extra: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Character> for CharacterResponse {
    fn from(m: Character) -> Self {
        Self { id: m.id, name: m.name, age: m.age, birthday: m.birthday,
               gender: m.gender, sexuality: m.sexuality, nationality: m.nationality,
               extra: m.extra, created_at: m.created_at, updated_at: m.updated_at }
    }
}