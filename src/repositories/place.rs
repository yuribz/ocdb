use crate::db::DbPool;

pub struct PlaceRepository<'a> {
    pool: &'a DbPool,
}