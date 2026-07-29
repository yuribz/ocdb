//! Application configuration loaded from environment variables.

use anyhow::Context;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub port: u16,
    pub s3_endpoint_url: String,
    pub s3_public_url_base: String,
    pub s3_region: String,
    pub s3_bucket: String,
    pub s3_access_key_id: String,
    pub s3_secret_access_key: String,
}

impl AppConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        let database_url = std::env::var("DATABASE_URL").context("DATABASE_URL must be set")?;
        let port = std::env::var("PORT")
            .unwrap_or_else(|_| "3000".to_string())
            .parse()
            .context("PORT must be a valid u16")?;
        let s3_endpoint_url =
            std::env::var("S3_ENDPOINT_URL").context("S3_ENDPOINT_URL must be set")?;
        let s3_public_url_base =
            std::env::var("S3_PUBLIC_URL_BASE").context("S3_PUBLIC_URL_BASE must be set")?;
        let s3_region = std::env::var("S3_REGION").unwrap_or_else(|_| "us-east-1".to_string());
        let s3_bucket = std::env::var("S3_BUCKET").unwrap_or_else(|_| "ocdb-images".to_string());
        let s3_access_key_id =
            std::env::var("S3_ACCESS_KEY_ID").context("S3_ACCESS_KEY_ID must be set")?;
        let s3_secret_access_key =
            std::env::var("S3_SECRET_ACCESS_KEY").context("S3_SECRET_ACCESS_KEY must be set")?;

        Ok(Self {
            database_url,
            port,
            s3_endpoint_url,
            s3_public_url_base,
            s3_region,
            s3_bucket,
            s3_access_key_id,
            s3_secret_access_key,
        })
    }
}
