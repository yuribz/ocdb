//! Database engine: connection pool setup and migration runner.

use std::time::Duration;

use sqlx::postgres::{PgPool, PgPoolOptions};

pub type DbPool = PgPool;

/// Creates the Postgres connection pool used by the whole application.
pub async fn init_pool(database_url: &str) -> Result<DbPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await
}

/// Applies any pending SQL migrations from the `migrations/` directory.
pub async fn run_migrations(pool: &DbPool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(pool).await
}
