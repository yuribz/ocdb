// @ts-check

import { errorMessageFrom } from "./api.js";

/**
 * @typedef {Object} ModalController
 * @property {() => void} open
 * @property {() => void} close
 * @property {() => void} edit
 * @property {() => void} endEditing
 * @property {() => void} creating
 * @property {() => void} endCreating
 */

/**
 * Initialize a modal element with basic open/close/state logic.
 * @param {HTMLElement} element - The modal element
 * @param {Object} [opts]
 * @param {() => void} [opts.onClose] - Callback when modal closes
 * @returns {ModalController}
 */
export function initModal(element, { onClose } = {}) {
    function close() {
        element.hidden = true;
        onClose?.();
    }

    function edit() {
        element.classList.add("editing");
    }

    function endEditing() {
        element.classList.remove("editing");
    }

    function creating() {
        element.classList.add("creating");
    }

    function endCreating() {
        element.classList.remove("creating");
    }

    function open() {
        element.hidden = false;
    }

    element.addEventListener("click", (event) => {
        if (event.target === element) close();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !element.hidden) close();
    });

    return { open, close, edit, endEditing, creating, endCreating };
}

/**
 * @param {HTMLElement} root
 * @returns {{title: HTMLElement, view: HTMLElement, form: HTMLFormElement, formFields: HTMLElement, formError: HTMLElement}}
 */
function queryModalElements(root) {
    return {
        title: root.querySelector(".modal-title"),
        view: root.querySelector(".modal-view"),
        form: root.querySelector(".modal-form"),
        formFields: root.querySelector(".modal-form-fields"),
        formError: root.querySelector(".modal-form-error"),
    };
}

/**
 * Extract error message from a response.
 * @param {Response} response
 * @returns {Promise<Error>}
 */
async function errorFromResponse(response) {
    return new Error(await errorMessageFrom(response, "Save failed."));
}

/**
 * Generate a unique input ID for a field.
 * @param {HTMLElement} root - Modal element
 * @param {string} key - Field key
 * @returns {string}
 */
function inputIdFor(root, key) {
    return `${root.id}-field-${key}`;
}

/**
 * @typedef {Object} FieldOption
 * @property {string} value
 * @property {string} label
 */

/**
 * @typedef {"view"|"create"|"edit"} ModalMode
 */

/**
 * @typedef {Object} EntityModalController
 * @property {(id: string|number) => Promise<any>} openView - Load and display entity
 * @property {() => Promise<void>} openCreate - Initialize create mode
 * @property {(data: any) => Promise<void>} enterEdit - Enter edit mode with data
 * @property {(viewData?: any) => void} cancelEdit - Exit edit mode
 * @property {() => void} close - Close modal
 */

// A single reusable controller for an entity's view/edit/create modal, driven
// entirely by a field schema. Knows nothing about entity-specific extras
// (e.g. a character's image gallery or pronoun list) — those stay in the
// caller, layered on top of openView()'s returned data.
/**
 * @param {Object} opts
 * @param {HTMLElement} opts.element - Modal element
 * @param {import('./entity_schemas.js').Schema} opts.schema - Entity schema
 * @param {import('./api.js').EntityClient} opts.client - Entity API client
 * @param {(data?: any) => void} [opts.onSaved] - Callback after save
 * @returns {EntityModalController}
 */
export function createEntityModal({ element, schema, client, onSaved }) {
    const modalCtl = initModal(element);
    const els = queryModalElements(element);

    /** @type {ModalMode} */
    let mode = "view";
    let currentId = null;

    function viewFields() {
        return schema.fields.filter((field) => field.view);
    }

    function formFields() {
        return schema.fields.filter((field) => field.form !== false);
    }

    function renderView(data) {
        els.view.innerHTML = "";
        for (const field of viewFields()) {
            const raw = data?.[field.key];
            const value = field.formatView ? field.formatView(raw) : raw;
            if (value === null || value === undefined) continue;

            const dt = document.createElement("dt");
            dt.textContent = field.label;
            const dd = document.createElement("dd");
            dd.textContent = value;
            els.view.appendChild(dt);
            els.view.appendChild(dd);
        }
    }

    /**
     * Resolve a select field's options, tolerating a failed async fetch by
     * falling back to an empty option list rather than breaking form render.
     * @param {import('./entity_schemas.js').Field} field
     * @returns {Promise<FieldOption[]>}
     */
    async function resolveSelectOptions(field) {
        if (typeof field.options !== "function") return field.options ?? [];
        try {
            return await field.options();
        } catch {
            return [];
        }
    }

    /**
     * @param {any} data
     * @returns {Promise<void>}
     */
    async function renderForm(data) {
        els.formFields.innerHTML = "";
        for (const field of formFields()) {
            const label = document.createElement("label");
            label.textContent = field.label;
            label.htmlFor = inputIdFor(element, field.key);

            const existing = data?.[field.key];

            if (field.type === "select") {
                const select = document.createElement("select");
                select.id = inputIdFor(element, field.key);
                select.name = field.key;
                if (field.required) select.required = true;

                for (const opt of await resolveSelectOptions(field)) {
                    const option = document.createElement("option");
                    option.value = opt.value;
                    option.textContent = opt.label;
                    select.appendChild(option);
                }
                select.value = existing ?? "";

                label.appendChild(select);
            } else {
                const input = document.createElement("input");
                input.type = field.type ?? "text";
                input.id = inputIdFor(element, field.key);
                input.name = field.key;
                if (field.required) input.required = true;
                if (existing !== undefined && existing !== null) input.value = existing;

                label.appendChild(input);
            }

            els.formFields.appendChild(label);
        }
    }

    function readFormValues() {
        const formData = new FormData(els.form);
        const values = {};
        for (const field of formFields()) {
            values[field.key] = formData.get(field.key);
        }
        return values;
    }

    /**
     * @param {string|number} id
     * @returns {Promise<any>}
     */
    async function openView(id) {
        mode = "view";
        currentId = id;
        modalCtl.endEditing();
        modalCtl.endCreating();
        const data = await client.get(id);
        els.title.textContent = schema.title(data);
        renderView(data);
        modalCtl.open();
        return data;
    }

    /**
     * @returns {Promise<void>}
     */
    async function openCreate() {
        mode = "create";
        currentId = null;
        els.formError.textContent = "";
        els.title.textContent = schema.title(null);
        await renderForm({});
        modalCtl.creating();
        modalCtl.open();
    }

    /**
     * @param {any} data
     * @returns {Promise<void>}
     */
    async function enterEdit(data) {
        mode = "edit";
        els.formError.textContent = "";
        await renderForm(data);
        modalCtl.edit();
    }

    /**
     * @param {any} [viewData]
     * @returns {void}
     */
    function cancelEdit(viewData) {
        mode = "view";
        modalCtl.endEditing();
        modalCtl.endCreating();
        if (viewData) renderView(viewData);
        else modalCtl.close();
    }

    async function handleSubmit(event) {
        event.preventDefault();
        els.formError.textContent = "";
        const values = readFormValues();

        try {
            if (mode === "create") {
                const response = await client.create(schema.toCreatePayload(values));
                if (!response.ok) throw await errorFromResponse(response);
                modalCtl.close();
                modalCtl.endCreating();
                onSaved?.();
            } else if (mode === "edit") {
                const response = await client.update(currentId, schema.toUpdatePayload(values));
                if (!response.ok) throw await errorFromResponse(response);
                const fresh = await client.get(currentId);
                mode = "view";
                modalCtl.endEditing();
                els.title.textContent = schema.title(fresh);
                renderView(fresh);
                onSaved?.(fresh);
            }
        } catch (err) {
            els.formError.textContent = err.message ?? "Save failed.";
        }
    }

    els.form.addEventListener("submit", handleSubmit);

    return { openView, openCreate, enterEdit, cancelEdit, close: modalCtl.close };
}
