//! CRUD operations for the `pronouns` table.

use uuid::Uuid;

use crate::db::DbPool;
use crate::models::pronoun::{NewPronoun, Pronoun, UpdatePronoun};

pub struct PronounRepository<'a> {
    pool: &'a DbPool,
}

impl<'a> PronounRepository<'a> {
    pub fn new(pool: &'a DbPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, new_pronoun: NewPronoun) -> Result<Pronoun, sqlx::Error> {
        sqlx::query_as::<_, Pronoun>(
            r#"
            INSERT INTO pronouns
                (character_id, subject, object, possessive, possessive_determiner, reflexive, is_primary)
            VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, false))
            RETURNING *
            "#,
        )
        .bind(new_pronoun.character_id)
        .bind(new_pronoun.subject)
        .bind(new_pronoun.object)
        .bind(new_pronoun.possessive)
        .bind(new_pronoun.possessive_determiner)
        .bind(new_pronoun.reflexive)
        .bind(new_pronoun.is_primary)
        .fetch_one(self.pool)
        .await
    }

    pub async fn get_by_id(&self, id: Uuid) -> Result<Option<Pronoun>, sqlx::Error> {
        sqlx::query_as::<_, Pronoun>("SELECT * FROM pronouns WHERE id = $1")
            .bind(id)
            .fetch_optional(self.pool)
            .await
    }

    pub async fn list_for_character(
        &self,
        character_id: Uuid,
    ) -> Result<Vec<Pronoun>, sqlx::Error> {
        sqlx::query_as::<_, Pronoun>(
            "SELECT * FROM pronouns WHERE character_id = $1 ORDER BY is_primary DESC, created_at ASC",
        )
        .bind(character_id)
        .fetch_all(self.pool)
        .await
    }

    pub async fn update(
        &self,
        id: Uuid,
        update: UpdatePronoun,
    ) -> Result<Option<Pronoun>, sqlx::Error> {
        sqlx::query_as::<_, Pronoun>(
            r#"
            UPDATE pronouns
            SET subject = COALESCE($2, subject),
                object = COALESCE($3, object),
                possessive = COALESCE($4, possessive),
                possessive_determiner = COALESCE($5, possessive_determiner),
                reflexive = COALESCE($6, reflexive),
                is_primary = COALESCE($7, is_primary)
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(update.subject)
        .bind(update.object)
        .bind(update.possessive)
        .bind(update.possessive_determiner)
        .bind(update.reflexive)
        .bind(update.is_primary)
        .fetch_optional(self.pool)
        .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM pronouns WHERE id = $1")
            .bind(id)
            .execute(self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
