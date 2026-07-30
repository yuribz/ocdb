// @ts-check

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
 * @returns {Object} {title: HTMLElement, view: HTMLElement, form: HTMLFormElement, formFields: HTMLElement, formError: HTMLElement}
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
    const body = await response.json().catch(() => ({}));
    return new Error(body.error ?? "Save failed.");
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
 * @typedef {Object} EntityModalController
 * @property {(id: string|number) => Promise<any>} openView - Load and display entity
 * @property {() => void} openCreate - Initialize create mode
 * @property {(data: any) => void} enterEdit - Enter edit mode with data
 * @property {(viewData?: any) => void} cancelEdit - Exit edit mode
 * @property {() => void} close - Close modal
 */

/**
 * Generic schema-driven modal controller for view/edit/create workflows.
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

    function renderForm(data) {
        els.formFields.innerHTML = "";
        for (const field of formFields()) {
            const label = document.createElement("label");
            label.textContent = field.label;
            label.htmlFor = inputIdFor(element, field.key);

            const input = document.createElement("input");
            input.type = field.type ?? "text";
            input.id = inputIdFor(element, field.key);
            input.name = field.key;
            if (field.required) input.required = true;
            const existing = data?.[field.key];
            if (existing !== undefined && existing !== null) input.value = existing;

            label.appendChild(input);
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

    function openCreate() {
        mode = "create";
        currentId = null;
        els.formError.textContent = "";
        els.title.textContent = schema.title(null);
        renderForm({});
        modalCtl.creating();
        modalCtl.open();
    }

    function enterEdit(data) {
        mode = "edit";
        els.formError.textContent = "";
        renderForm(data);
        modalCtl.edit();
    }

    function cancelEdit(viewData) {
        mode = "view";
        modalCtl.endEditing();
        modalCtl.endCreating();
        if (viewData) renderView(viewData);
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
