//! OpenAPI document assembled from every `#[utoipa::path]`-annotated handler.
//! Served as JSON and browsable Swagger UI, see `main.rs`.

use utoipa::OpenApi;

use crate::models::character::{Character, NewCharacter, UpdateCharacter};
use crate::models::image::{ArchivedImage, Image, ImageUpload, UpdateImageLink};
use crate::models::pronoun::{NewPronoun, Pronoun, UpdatePronoun};

#[derive(OpenApi)]
#[openapi(
    paths(
        super::health::health,
        super::characters::list_characters,
        super::characters::create_character,
        super::characters::get_character,
        super::characters::update_character,
        super::characters::delete_character,
        super::pronouns::list_pronouns_for_character,
        super::pronouns::create_pronoun,
        super::pronouns::get_pronoun,
        super::pronouns::update_pronoun,
        super::pronouns::delete_pronoun,
        super::images::list_images_for_character,
        super::images::upload_image_for_character,
        super::images::get_image_link,
        super::images::update_image_link,
        super::images::delete_image_link,
        super::images::list_archived_images,
    ),
    components(schemas(
        Character,
        NewCharacter,
        UpdateCharacter,
        Pronoun,
        NewPronoun,
        UpdatePronoun,
        Image,
        ImageUpload,
        UpdateImageLink,
        ArchivedImage,
    )),
    tags(
        (name = "health", description = "Service health"),
        (name = "characters", description = "Character CRUD"),
        (name = "pronouns", description = "Pronoun-set CRUD"),
        (name = "images", description = "General image catalog, linked to entities — characters today, more entity types later"),
    ),
)]
pub struct ApiDoc;
