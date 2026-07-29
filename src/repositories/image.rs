//! CRUD for the image catalog + its entity links. Every operation that
//! touches both tables (upload, unlink) runs in a transaction so `images`
//! and `image_links` can't end up inconsistent.

use uuid::Uuid;

use crate::db::DbPool;
use crate::models::image::{ImageRow, LinkedImageRow};

pub struct ImageRepository<'a> {
    pool: &'a DbPool,
}

impl<'a> ImageRepository<'a> {
    pub fn new(pool: &'a DbPool) -> Self {
        Self { pool }
    }

    /// Inserts a new catalog image and links it to `(entity_type,
    /// entity_id)` in one transaction.
    pub async fn upload_and_link(
        &self,
        entity_type: &str,
        entity_id: Uuid,
        object_key: &str,
        content_type: &str,
        caption: Option<&str>,
        is_primary: Option<bool>,
    ) -> Result<LinkedImageRow, sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        let image_id: Uuid = sqlx::query_scalar(
            "INSERT INTO images (object_key, content_type, caption) VALUES ($1, $2, $3) RETURNING id",
        )
        .bind(object_key)
        .bind(content_type)
        .bind(caption)
        .fetch_one(&mut *tx)
        .await?;

        let link = sqlx::query_as::<_, LinkedImageRow>(
            r#"
            WITH inserted_link AS (
                INSERT INTO image_links (image_id, entity_type, entity_id, is_primary)
                VALUES ($1, $2, $3, COALESCE($4, false))
                RETURNING id, image_id, is_primary, created_at
            )
            SELECT
                inserted_link.id AS link_id,
                i.id AS image_id,
                i.object_key,
                i.content_type,
                i.caption,
                inserted_link.is_primary,
                inserted_link.created_at AS linked_at
            FROM inserted_link
            JOIN images i ON i.id = inserted_link.image_id
            "#,
        )
        .bind(image_id)
        .bind(entity_type)
        .bind(entity_id)
        .bind(is_primary)
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(link)
    }

    pub async fn list_for_entity(
        &self,
        entity_type: &str,
        entity_id: Uuid,
    ) -> Result<Vec<LinkedImageRow>, sqlx::Error> {
        sqlx::query_as::<_, LinkedImageRow>(
            r#"
            SELECT l.id AS link_id, i.id AS image_id, i.object_key, i.content_type,
                   i.caption, l.is_primary, l.created_at AS linked_at
            FROM image_links l
            JOIN images i ON i.id = l.image_id
            WHERE l.entity_type = $1 AND l.entity_id = $2 AND i.archived_at IS NULL
            ORDER BY l.is_primary DESC, l.created_at ASC
            "#,
        )
        .bind(entity_type)
        .bind(entity_id)
        .fetch_all(self.pool)
        .await
    }

    pub async fn get_link(&self, link_id: Uuid) -> Result<Option<LinkedImageRow>, sqlx::Error> {
        sqlx::query_as::<_, LinkedImageRow>(
            r#"
            SELECT l.id AS link_id, i.id AS image_id, i.object_key, i.content_type,
                   i.caption, l.is_primary, l.created_at AS linked_at
            FROM image_links l
            JOIN images i ON i.id = l.image_id
            WHERE l.id = $1
            "#,
        )
        .bind(link_id)
        .fetch_optional(self.pool)
        .await
    }

    /// Updates the linked image's caption (on `images`) and/or the link's
    /// primary flag (on `image_links`), whichever are `Some`.
    pub async fn update_link(
        &self,
        link_id: Uuid,
        caption: Option<String>,
        is_primary: Option<bool>,
    ) -> Result<Option<LinkedImageRow>, sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        let image_id: Option<Uuid> =
            sqlx::query_scalar("SELECT image_id FROM image_links WHERE id = $1")
                .bind(link_id)
                .fetch_optional(&mut *tx)
                .await?;
        let Some(image_id) = image_id else {
            tx.commit().await?;
            return Ok(None);
        };

        if caption.is_some() {
            sqlx::query("UPDATE images SET caption = $2 WHERE id = $1")
                .bind(image_id)
                .bind(&caption)
                .execute(&mut *tx)
                .await?;
        }
        if is_primary.is_some() {
            sqlx::query("UPDATE image_links SET is_primary = $2 WHERE id = $1")
                .bind(link_id)
                .bind(is_primary)
                .execute(&mut *tx)
                .await?;
        }

        let updated = sqlx::query_as::<_, LinkedImageRow>(
            r#"
            SELECT l.id AS link_id, i.id AS image_id, i.object_key, i.content_type,
                   i.caption, l.is_primary, l.created_at AS linked_at
            FROM image_links l
            JOIN images i ON i.id = l.image_id
            WHERE l.id = $1
            "#,
        )
        .bind(link_id)
        .fetch_optional(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(updated)
    }

    /// Deletes one link; archives the image if that was its last link.
    /// Returns whether a link existed to delete.
    pub async fn unlink(&self, link_id: Uuid) -> Result<bool, sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        let image_id: Option<Uuid> =
            sqlx::query_scalar("DELETE FROM image_links WHERE id = $1 RETURNING image_id")
                .bind(link_id)
                .fetch_optional(&mut *tx)
                .await?;

        let Some(image_id) = image_id else {
            tx.commit().await?;
            return Ok(false);
        };

        archive_if_linkless(&mut tx, image_id).await?;

        tx.commit().await?;
        Ok(true)
    }

    /// Deletes every link for `(entity_type, entity_id)`; archives each
    /// image left with no remaining links. Called before deleting the
    /// entity itself (see `services::character::CharacterService::delete`).
    pub async fn unlink_all_for_entity(
        &self,
        entity_type: &str,
        entity_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        let mut tx = self.pool.begin().await?;

        let image_ids: Vec<Uuid> = sqlx::query_scalar(
            "DELETE FROM image_links WHERE entity_type = $1 AND entity_id = $2 RETURNING image_id",
        )
        .bind(entity_type)
        .bind(entity_id)
        .fetch_all(&mut *tx)
        .await?;

        for image_id in image_ids {
            archive_if_linkless(&mut tx, image_id).await?;
        }

        tx.commit().await?;
        Ok(())
    }

    pub async fn list_archived(&self) -> Result<Vec<ImageRow>, sqlx::Error> {
        sqlx::query_as::<_, ImageRow>(
            "SELECT * FROM images WHERE archived_at IS NOT NULL ORDER BY archived_at DESC",
        )
        .fetch_all(self.pool)
        .await
    }
}

async fn archive_if_linkless(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    image_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE images SET archived_at = now()
        WHERE id = $1
          AND archived_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM image_links WHERE image_id = $1)
        "#,
    )
    .bind(image_id)
    .execute(&mut **tx)
    .await?;
    Ok(())
}
