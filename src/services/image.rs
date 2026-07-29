//! Image catalog business logic: validates uploads, writes to object
//! storage, and links/unlinks images to entities. Unlinking is DB-only
//! (soft-archive) — no storage call.

use uuid::Uuid;

use crate::db::DbPool;
use crate::error::AppError;
use crate::models::image::{ArchivedImage, Image};
use crate::repositories::image::ImageRepository;
use crate::storage::Storage;

const ALLOWED_CONTENT_TYPES: &[&str] = &["image/png", "image/jpeg", "image/webp", "image/gif"];

pub struct ImageService<'a> {
    repo: ImageRepository<'a>,
    storage: &'a Storage,
}

impl<'a> ImageService<'a> {
    pub fn new(pool: &'a DbPool, storage: &'a Storage) -> Self {
        Self {
            repo: ImageRepository::new(pool),
            storage,
        }
    }

    pub async fn upload(
        &self,
        entity_type: &str,
        entity_id: Uuid,
        content_type: Option<&str>,
        bytes: Vec<u8>,
        caption: Option<String>,
        is_primary: Option<bool>,
    ) -> Result<Image, AppError> {
        let content_type = content_type.unwrap_or("application/octet-stream");
        if !ALLOWED_CONTENT_TYPES.contains(&content_type) {
            return Err(AppError::Validation(format!(
                "unsupported image content type: {content_type}"
            )));
        }
        if bytes.is_empty() {
            return Err(AppError::Validation("uploaded file is empty".to_string()));
        }

        let object_key = format!(
            "{entity_type}/{entity_id}/{}.{}",
            Uuid::new_v4(),
            extension_for(content_type),
        );

        self.storage.put_object(&object_key, bytes, content_type).await?;

        let row = self
            .repo
            .upload_and_link(entity_type, entity_id, &object_key, content_type, caption.as_deref(), is_primary)
            .await?;
        Ok(Image::from_linked_row(row, self.storage.public_url(&object_key)))
    }

    pub async fn list_for_entity(&self, entity_type: &str, entity_id: Uuid) -> Result<Vec<Image>, AppError> {
        let rows = self.repo.list_for_entity(entity_type, entity_id).await?;
        Ok(rows
            .into_iter()
            .map(|row| {
                let url = self.storage.public_url(&row.object_key);
                Image::from_linked_row(row, url)
            })
            .collect())
    }

    pub async fn get_link(&self, link_id: Uuid) -> Result<Option<Image>, AppError> {
        let row = self.repo.get_link(link_id).await?;
        Ok(row.map(|row| {
            let url = self.storage.public_url(&row.object_key);
            Image::from_linked_row(row, url)
        }))
    }

    pub async fn update_link(
        &self,
        link_id: Uuid,
        caption: Option<String>,
        is_primary: Option<bool>,
    ) -> Result<Option<Image>, AppError> {
        let row = self.repo.update_link(link_id, caption, is_primary).await?;
        Ok(row.map(|row| {
            let url = self.storage.public_url(&row.object_key);
            Image::from_linked_row(row, url)
        }))
    }

    pub async fn unlink(&self, link_id: Uuid) -> Result<bool, AppError> {
        Ok(self.repo.unlink(link_id).await?)
    }

    pub async fn list_archived(&self) -> Result<Vec<ArchivedImage>, AppError> {
        let rows = self.repo.list_archived().await?;
        Ok(rows
            .into_iter()
            .map(|row| {
                let url = self.storage.public_url(&row.object_key);
                ArchivedImage::from_row(row, url)
            })
            .collect())
    }
}

fn extension_for(content_type: &str) -> &'static str {
    match content_type {
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "jpg",
    }
}
