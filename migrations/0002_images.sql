-- General, entity-agnostic image catalog. Soft-deleted via archived_at
-- rather than a parallel table or a physical delete -- an image with no
-- remaining live links (see image_links) gets archived_at set, but its
-- row (and its object in storage) is never removed by the app.
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_key TEXT NOT NULL,
    content_type TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ
);

-- Polymorphic association: links an image to any entity (characters today;
-- places/items/events/etc. later) without images needing to know what
-- kinds of things can own them. entity_type is a free-form tag (see
-- models::image::entity_type), entity_id is that entity's UUID -- no FK
-- constraint, since Postgres can't FK against "whichever table entity_type
-- names." is_primary lives here (per-attachment "cover image" flag), not
-- on images, since in principle the same image could be primary for one
-- entity and not another.
CREATE TABLE image_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (image_id, entity_type, entity_id)
);

CREATE INDEX idx_image_links_entity ON image_links (entity_type, entity_id);
CREATE INDEX idx_image_links_image_id ON image_links (image_id);
