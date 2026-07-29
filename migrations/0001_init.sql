-- Core schema: characters and their pronoun sets.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    birthday DATE,
    gender TEXT NOT NULL,
    sexuality TEXT NOT NULL,
    nationality TEXT,
    extra JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pronouns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    object TEXT NOT NULL,
    possessive TEXT NOT NULL,
    possessive_determiner TEXT NOT NULL,
    reflexive TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pronouns_character_id ON pronouns (character_id);
