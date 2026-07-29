// Single source of truth for an entity's fields: drives view rendering, form
// generation, and create/update payload construction from one field list
// instead of three hand-written copies.

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
