// @ts-check

/**
 * @typedef {Object} Field
 * @property {string} key - Field identifier
 * @property {string} [label] - Display label in forms and views
 * @property {"text"|"number"|"date"} [type] - HTML input type; defaults to "text"
 * @property {boolean} [required] - Whether the field is required in forms
 * @property {boolean} [view] - Whether to show in read-only view
 * @property {boolean} [form] - Whether to show in forms; defaults to true
 * @property {(value: any) => string|null} [formatView] - Custom renderer for view display
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
