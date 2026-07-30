use sqlx::{Error, Postgres, query_builder::Separated};
use std::{
    collections::HashMap,
    hash::Hash,
};

pub trait Table {
    const TABLE: &'static str;
}

pub trait Insertable: Table {
    const COLUMNS: &'static [&'static str];

    // pushes one bind per column, same order as COLUMNS
    fn push_values<'q>(self, sep: &mut Separated<'_, 'q, Postgres, &'static str>);
}

pub trait Updatable: Table {
    // pushes "col = COALESCE($n, col)" for each present field
    fn push_set<'q>(self, sep: &mut Separated<'_, 'q, Postgres, &'static str>);
}

trait BaseRepository: Table {
    type Entity;
    type New : Insertable;
    type Update : Updatable;
    type Id : Hash;
    type Filter;

    async fn create(
        &self, 
        params: Self::New
    ) -> Result<Self::Entity, Error>;

    async fn get_by_id(
        &self,
        id: Self::Id,
    ) -> Result<Option<Self::Entity>, Error>;

    async fn list(
        &self,
        filter: Self::Filter,
    ) -> Result<Vec<Self::Entity>, Error>;

    async fn update(
        &self,
        id: Self::Id,
        params: Self::Update
    ) -> Result<Option<Self::Entity>, Error>;

    async fn delete(
        &self, 
        id: Self::Id
    ) -> Result<bool, Error>;

    async fn bulk_create(
        &self, 
        params: Vec<Self::New>,
    ) -> Result<Vec<Self::Entity>, Error>;

    async fn bulk_update(
        &self,
        params: HashMap<Self::Id, Self::Entity>,
    ) -> Result<Option<Self::Entity>, Error>;
}