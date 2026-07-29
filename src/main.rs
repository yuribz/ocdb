mod config;
mod db;
mod error;
mod models;
mod repositories;
mod routes;
mod services;
mod state;
mod storage;

use anyhow::Context;
use axum::Router;
use tower_http::{services::ServeDir, trace::TraceLayer};
use tracing_subscriber::EnvFilter;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::routes::openapi::ApiDoc;
use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();

    let config = config::AppConfig::from_env()?;

    let pool = db::init_pool(&config.database_url)
        .await
        .context("failed to connect to database")?;
    db::run_migrations(&pool)
        .await
        .context("failed to run database migrations")?;

    let storage = storage::Storage::new(&config).await;
    storage
        .ensure_bucket()
        .await
        .context("failed to initialize S3 bucket")?;

    let state = AppState { db: pool, storage };
    let api_router = routes::router().with_state(state);

    let app = Router::new()
        .nest("/api", api_router)
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .fallback_service(ServeDir::new("static"))
        .layer(TraceLayer::new_for_http());

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
