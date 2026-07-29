//! Pronoun business logic goes here.

use uuid::Uuid;

use crate::db::DbPool;
use crate::models::pronoun::{NewPronoun, Pronoun, UpdatePronoun};
use crate::repositories::pronoun::PronounRepository;

pub struct PronounService<'a> {
    repo: PronounRepository<'a>,
}

impl<'a> PronounService<'a> {
    pub fn new(pool: &'a DbPool) -> Self {
        Self {
            repo: PronounRepository::new(pool),
        }
    }

    pub async fn create(&self, new_pronoun: NewPronoun) -> Result<Pronoun, sqlx::Error> {
        self.repo.create(new_pronoun).await
    }

    pub async fn get_by_id(&self, id: Uuid) -> Result<Option<Pronoun>, sqlx::Error> {
        self.repo.get_by_id(id).await
    }

    pub async fn list_for_character(
        &self,
        character_id: Uuid,
    ) -> Result<Vec<Pronoun>, sqlx::Error> {
        self.repo.list_for_character(character_id).await
    }

    pub async fn update(
        &self,
        id: Uuid,
        update: UpdatePronoun,
    ) -> Result<Option<Pronoun>, sqlx::Error> {
        self.repo.update(id, update).await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        self.repo.delete(id).await
    }
}
