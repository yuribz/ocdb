//! CRUD operations for the `characters` table.

use uuid::Uuid;

use crate::db::DbPool;
use crate::models::character::{Character, NewCharacter, UpdateCharacter};

pub struct CharacterRepository<'a> {
    pool: &'a DbPool,
}

impl<'a> CharacterRepository<'a> {
    pub fn new(pool: &'a DbPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, new_character: NewCharacter) -> Result<Character, sqlx::Error> {
        sqlx::query_as::<_, Character>(
            r#"
            INSERT INTO characters (name, age, birthday, gender, sexuality, nationality, extra)
            VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, '{}'::jsonb))
            RETURNING *
            "#,
        )
        .bind(new_character.name)
        .bind(new_character.age)
        .bind(new_character.birthday)
        .bind(new_character.gender)
        .bind(new_character.sexuality)
        .bind(new_character.nationality)
        .bind(new_character.extra)
        .fetch_one(self.pool)
        .await
    }

    pub async fn get_by_id(&self, id: Uuid) -> Result<Option<Character>, sqlx::Error> {
        sqlx::query_as::<_, Character>("SELECT * FROM characters WHERE id = $1")
            .bind(id)
            .fetch_optional(self.pool)
            .await
    }

    pub async fn list(&self) -> Result<Vec<Character>, sqlx::Error> {
        sqlx::query_as::<_, Character>("SELECT * FROM characters ORDER BY created_at DESC")
            .fetch_all(self.pool)
            .await
    }

    pub async fn update(
        &self,
        id: Uuid,
        update: UpdateCharacter,
    ) -> Result<Option<Character>, sqlx::Error> {
        sqlx::query_as::<_, Character>(
            r#"
            UPDATE characters
            SET name = COALESCE($2, name),
                age = COALESCE($3, age),
                birthday = COALESCE($4, birthday),
                gender = COALESCE($5, gender),
                sexuality = COALESCE($6, sexuality),
                nationality = COALESCE($7, nationality),
                extra = COALESCE($8, extra),
                updated_at = now()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(update.name)
        .bind(update.age)
        .bind(update.birthday)
        .bind(update.gender)
        .bind(update.sexuality)
        .bind(update.nationality)
        .bind(update.extra)
        .fetch_optional(self.pool)
        .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM characters WHERE id = $1")
            .bind(id)
            .execute(self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
