use sqlx::{Error, FromRow, Postgres, QueryBuilder, postgres::PgRow, query_builder::Separated};
use std::{
    collections::HashMap,
    hash::Hash,
};

use crate::db::DbPool;

pub trait Table {
    const TABLE: &'static str;
    const PK: &'static str = "id";
    const ORDER_BY: &'static str = "id";
}

pub trait Insertable: Table {
    const COLUMNS: &'static [&'static str];
    fn push_values<'q>(self, sep: &mut Separated<'_, 'q, Postgres, &'static str>);
}

pub trait Updatable: Table {
    fn push_set<'q>(self, sep: &mut Separated<'_, 'q, Postgres, &'static str>);
}

pub trait Filterable {
    /// Pushes a complete `WHERE ...` fragment including the keyword.
    /// Returns whether anything was pushed.
    fn push_where(self, qb: &mut QueryBuilder<'_, Postgres>) -> bool;
}

// the free "no filtering" case — used by Character::list
impl Filterable for () {
    fn push_where(self, _: &mut QueryBuilder<'_, Postgres>) -> bool { false }
}

pub trait BaseRepository: Table {
    type Entity: for<'r> FromRow<'r, PgRow> + Send + Unpin;
    type New:    Insertable;
    type Update: Updatable;
    type Filter: Filterable;
    type Id:     Copy + Send + Sync
               + for<'q> sqlx::Encode<'q, Postgres> + sqlx::Type<Postgres>;

    fn pool(&self) -> &DbPool;   // the only required method

    // all defaulted, QueryBuilder-backed
    async fn create(&self, p: Self::New)     -> Result<Self::Entity, Error> { 
        self.pool().
     }
    async fn get_by_id(&self, id: Self::Id) -> Result<Option<Self::Entity>, Error> { .. }
    async fn list(&self, f: Self::Filter)  -> Result<Vec<Self::Entity>, Error> { .. }
    async fn update(&self, id: Self::Id, p: Self::Update)
        -> Result<Option<Self::Entity>, Error> { .. }
    async fn delete(&self, id: Self::Id)    -> Result<bool, Error> { .. }
    async fn bulk_create(&self, p: Vec<Self::New>)
        -> Result<Vec<Self::Entity>, Error> { .. }
    async fn bulk_update(&self, p: HashMap<Self::Id, Self::Update>)
        -> Result<Vec<Self::Entity>, Error> { .. }
}