//! Shared application state handed to every axum handler.

use crate::db::DbPool;
use crate::storage::Storage;

#[derive(Debug, Clone)]
pub struct AppState {
    pub db: DbPool,
    pub storage: Storage,
}
