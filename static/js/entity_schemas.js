// @ts-check

import { places as placesApi } from "./api.js";

/**
 * @typedef {Object} Field
 * @property {string} key - Field identifier
 * @property {string} [label] - Display label in forms and views
 * @property {"text"|"number"|"date"|"select"} [type] - HTML input type; defaults to "text"
 * @property {boolean} [required] - Whether the field is required in forms
 * @property {boolean} [view] - Whether to show in read-only view
 * @property {boolean} [form] - Whether to show in forms; defaults to true
 * @property {(value: any) => string|null} [formatView] - Custom renderer for view display
 * @property {import('./modal.js').FieldOption[] | (() => Promise<import('./modal.js').FieldOption[]>)} [options] - For type "select": a static option list, or an async function resolving one (e.g. fetched from an API)
 */

/**
 * @typedef {Object} Schema
 * @property {string} entityName - Entity type name (e.g. "character")
 * @property {(entity: object|null) => string} title - Display title for an entity or null (for new)
 * @property {Field[]} fields - Field definitions
 * @property {(values: object) => object} toCreatePayload - Transform form values → create API payload
 * @property {(values: object) => object} toUpdatePayload - Transform form values → update API payload
 */

// Single source of truth for an entity's fields: drives view rendering, form
// generation, and create/update payload construction from one field list
// instead of three hand-written copies.

/** @type {Schema} */
export const characterSchema = {
    entityName: "character",
    title: (character) => character?.name ?? "New Character",
    fields: [
        // Not shown in the view <dl> — the title (schema.title) already
        // displays the name.
        { key: "name", label: "Name", type: "text", required: true, view: false },
        { key: "age", label: "Age", type: "number", required: true, view: true },
        {
            key: "birthday",
            label: "Birthday",
            type: "date",
            required: false,
            view: true,
            formatView: (value) => value ?? "Unknown",
        },
        { key: "gender", label: "Gender", type: "text", required: true, view: true },
        { key: "sexuality", label: "Sexuality", type: "text", required: true, view: true },
        {
            key: "nationality",
            label: "Nationality",
            type: "text",
            required: false,
            view: true,
            formatView: (value) => value ?? "Unknown",
        },
        // Not a form field — a read-only bag of custom data.
        {
            key: "extra",
            label: "Extra",
            view: true,
            form: false,
            formatView: (value) =>
                value && Object.keys(value).length ? JSON.stringify(value) : null,
        },
    ],
    toCreatePayload(values) {
        return {
            name: values.name,
            age: Number(values.age),
            birthday: values.birthday || null,
            gender: values.gender,
            sexuality: values.sexuality,
            nationality: values.nationality || null,
        };
    },
    toUpdatePayload(values) {
        return this.toCreatePayload(values);
    },
};

// Places backend isn't functional yet (no routes/migration/DTOs on
// add-places-entity as of this pass), so this schema is scaffolding: it will
// 404 against /api/places until that lands. `extra` is intentionally omitted
// — there's no backend DTO support for it yet, same as characters' `extra`
// isn't editable, just displayed.
/** @type {Schema} */
export const placesSchema = {
    entityName: "place",
    title: (place) => place?.name ?? "New Place",
    fields: [
        { key: "name", label: "Name", type: "text", required: true, view: false },
        { key: "place_type", label: "Type", type: "text", required: true, view: true },
        {
            key: "parent_location",
            label: "Parent Location",
            type: "select",
            required: false,
            view: true,
            // Shows the raw parent id for now — resolving it to the parent's
            // name would need an extra fetch per view-open; not worth it
            // while the backend isn't functional yet.
            formatView: (value) => value ?? "None (top-level)",
            options: async () => {
                const topLevel = { value: "", label: "None (top-level)" };
                try {
                    const all = await placesApi.list();
                    return [topLevel, ...all.map((p) => ({ value: p.id, label: p.name }))];
                } catch {
                    // /api/places doesn't exist yet — still offer the one
                    // option that doesn't depend on it.
                    return [topLevel];
                }
            },
        },
        { key: "description", label: "Description", type: "text", required: false, view: true },
    ],
    toCreatePayload(values) {
        return {
            name: values.name,
            place_type: values.place_type,
            parent_location: values.parent_location || null,
            description: values.description || "",
        };
    },
    toUpdatePayload(values) {
        return this.toCreatePayload(values);
    },
};
