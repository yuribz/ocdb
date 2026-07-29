//! Object storage client: connects to any S3-compatible endpoint (MinIO
//! locally, real AWS S3 in production), and idempotently ensures the
//! configured bucket exists with a public-read policy at startup.
//! Analogous to db.rs's pool/migration setup.
//!
//! Tradeoff: public-read bucket + stable directly-constructed URLs instead
//! of presigned URLs with expiry. Simpler, avoids URL-rotation complexity
//! in the frontend — the right call for a personal/local-use app. A
//! multi-tenant or genuinely private deployment should use presigned URLs
//! instead.
//!
//! No `delete_object`: images are archived, never hard-deleted from
//! storage (see models::image), so nothing calls it.

use anyhow::Context;
use aws_config::{BehaviorVersion, Region};
use aws_sdk_s3::{Client, config::Credentials, primitives::ByteStream};

use crate::config::AppConfig;
use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct Storage {
    client: Client,
    bucket: String,
    public_url_base: String,
}

impl Storage {
    /// Builds the S3 client from config. Does not touch the network — call
    /// `ensure_bucket` separately (see main.rs) to do that at startup.
    pub async fn new(config: &AppConfig) -> Self {
        let credentials = Credentials::new(
            &config.s3_access_key_id,
            &config.s3_secret_access_key,
            None,
            None,
            "ocdb-static",
        );

        let shared_config = aws_config::defaults(BehaviorVersion::latest())
            .region(Region::new(config.s3_region.clone()))
            .credentials_provider(credentials)
            .endpoint_url(&config.s3_endpoint_url)
            .load()
            .await;

        // force_path_style(true) is required for MinIO (and most
        // non-AWS S3-compatible services): bucket-in-path addressing
        // (http://host:port/bucket/key) rather than virtual-hosted-style
        // (http://bucket.host:port/key), which MinIO doesn't support
        // out of the box without extra DNS/subdomain setup.
        let s3_config = aws_sdk_s3::config::Builder::from(&shared_config)
            .force_path_style(true)
            .build();

        Self {
            client: Client::from_conf(s3_config),
            bucket: config.s3_bucket.clone(),
            public_url_base: config.s3_public_url_base.trim_end_matches('/').to_string(),
        }
    }

    /// Idempotently ensures the bucket exists and carries a public-read
    /// policy. Run once at startup (see main.rs), analogous to
    /// db::run_migrations. Fails fast on any unrecoverable setup error, so
    /// a broken S3 config surfaces at boot, not on first upload.
    pub async fn ensure_bucket(&self) -> anyhow::Result<()> {
        let exists = self
            .client
            .head_bucket()
            .bucket(&self.bucket)
            .send()
            .await
            .is_ok();

        if !exists {
            self.client
                .create_bucket()
                .bucket(&self.bucket)
                .send()
                .await
                .context("failed to create S3 bucket")?;
            tracing::info!(bucket = %self.bucket, "created S3 bucket");
        }

        self.client
            .put_bucket_policy()
            .bucket(&self.bucket)
            .policy(public_read_policy(&self.bucket))
            .send()
            .await
            .context("failed to set public-read bucket policy")?;

        Ok(())
    }

    pub async fn put_object(
        &self,
        key: &str,
        bytes: Vec<u8>,
        content_type: &str,
    ) -> Result<(), AppError> {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(ByteStream::from(bytes))
            .content_type(content_type)
            .send()
            .await
            .map_err(|err| AppError::Storage(err.to_string()))?;
        Ok(())
    }

    /// Directly-constructed, stable public URL — relies on the public-read
    /// bucket policy set by `ensure_bucket`, not presigning.
    pub fn public_url(&self, key: &str) -> String {
        format!("{}/{}/{}", self.public_url_base, self.bucket, key)
    }
}

fn public_read_policy(bucket: &str) -> String {
    format!(
        r#"{{
  "Version": "2012-10-17",
  "Statement": [
    {{
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::{bucket}/*"]
    }}
  ]
}}"#
    )
}
