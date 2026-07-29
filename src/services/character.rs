//! Character business logic goes here.

use uuid::Uuid;

use crate::db::DbPool;
use crate::models::character::{Character, NewCharacter, UpdateCharacter};
use crate::models::image::entity_type;
use crate::repositories::character::CharacterRepository;
use crate::repositories::image::ImageRepository;

pub struct CharacterService<'a> {
    repo: CharacterRepository<'a>,
    image_repo: ImageRepository<'a>,
}

impl<'a> CharacterService<'a> {
    pub fn new(pool: &'a DbPool) -> Self {
        Self {
            repo: CharacterRepository::new(pool),
            image_repo: ImageRepository::new(pool),
        }
    }

    pub async fn list(&self) -> Result<Vec<Character>, sqlx::Error> {
        self.repo.list().await
    }

    pub async fn create(&self, new_character: NewCharacter) -> Result<Character, sqlx::Error> {
        self.repo.create(new_character).await
    }

    pub async fn get_by_id(&self, id: Uuid) -> Result<Option<Character>, sqlx::Error> {
        self.repo.get_by_id(id).await
    }

    pub async fn update(
        &self,
        id: Uuid,
        update: UpdateCharacter,
    ) -> Result<Option<Character>, sqlx::Error> {
        self.repo.update(id, update).await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        self.image_repo.unlink_all_for_entity(entity_type::CHARACTER, id).await?;
        self.repo.delete(id).await
    }
}