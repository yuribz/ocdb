// @ts-check

import { characters, images as imagesApi, pronouns as pronounsApi, errorMessageFrom } from "./api.js";
import { createEntityModal } from "./modal.js";
import { characterSchema } from "./entity_schemas.js";
import { loadCharacters } from "./character_list.js";

const element = /** @type {HTMLElement} */ (document.getElementById("character-modal"));
const uploadForm = /** @type {HTMLFormElement} */ (document.getElementById("upload-form"));
const pronounForm = /** @type {HTMLFormElement} */ (document.getElementById("pronoun-form"));
const pronounFormId = /** @type {HTMLInputElement} */ (document.getElementById("pronoun-form-id"));
const pronounAddButton = /** @type {HTMLButtonElement} */ (document.getElementById("pronoun-add-button"));

/**
 * @param {string} name
 * @returns {HTMLInputElement}
 */
function pronounField(name) {
    return /** @type {HTMLInputElement} */ (pronounForm.elements.namedItem(name));
}

let currentCharacterId = null;
let lastFetchedCharacter = null;

const modal = createEntityModal({
    element,
    schema: characterSchema,
    client: characters,
    onSaved: (fresh) => {
        if (fresh) lastFetchedCharacter = fresh;
        loadCharacters();
    },
});

function formatPronoun(pronoun) {
    const base = `${pronoun.subject}/${pronoun.object}`;
    return pronoun.is_primary ? `${base} (primary)` : base;
}

/**
 * @param {any} pronoun
 * @returns {HTMLLIElement}
 */
function buildPronounItem(pronoun) {
    const item = document.createElement("li");

    const label = document.createElement("span");
    label.textContent = formatPronoun(pronoun);
    item.appendChild(label);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => openPronounForm(pronoun));
    item.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deletePronoun(pronoun.id));
    item.appendChild(deleteButton);

    if (!pronoun.is_primary) {
        const primaryButton = document.createElement("button");
        primaryButton.type = "button";
        primaryButton.textContent = "Set primary";
        primaryButton.addEventListener("click", () => setPronounPrimary(pronoun.id));
        item.appendChild(primaryButton);
    }

    return item;
}

/**
 * @param {any[]} pronounList
 * @returns {void}
 */
function renderPronouns(pronounList) {
    const list = document.getElementById("pronoun-list");
    list.innerHTML = "";
    for (const pronoun of pronounList) {
        list.appendChild(buildPronounItem(pronoun));
    }
}

/**
 * @returns {Promise<void>}
 */
async function refreshPronouns() {
    if (!currentCharacterId) return;
    renderPronouns(await pronounsApi.listForCharacter(currentCharacterId));
}

/**
 * @param {string|number} id
 * @returns {Promise<void>}
 */
async function deletePronoun(id) {
    if (!confirm("Delete this pronoun set?")) return;
    await pronounsApi.remove(id);
    await refreshPronouns();
}

/**
 * Note: the backend doesn't enforce "only one primary pronoun set per
 * character" (PronounService is a thin pass-through), so this can leave
 * multiple rows marked primary — a known gap, not something to fake here.
 * @param {string|number} id
 * @returns {Promise<void>}
 */
async function setPronounPrimary(id) {
    await pronounsApi.update(id, { is_primary: true });
    await refreshPronouns();
}

/**
 * @param {any|null} pronoun - Existing pronoun set to edit, or null to add a new one
 * @returns {void}
 */
function openPronounForm(pronoun) {
    pronounFormId.value = pronoun?.id ?? "";
    pronounField("subject").value = pronoun?.subject ?? "";
    pronounField("object").value = pronoun?.object ?? "";
    pronounField("possessive").value = pronoun?.possessive ?? "";
    pronounField("possessive_determiner").value = pronoun?.possessive_determiner ?? "";
    pronounField("reflexive").value = pronoun?.reflexive ?? "";
    pronounField("is_primary").checked = pronoun?.is_primary ?? false;
    document.getElementById("pronoun-form-error").textContent = "";

    pronounForm.hidden = false;
    pronounAddButton.hidden = true;
}

/**
 * @returns {void}
 */
function closePronounForm() {
    pronounForm.reset();
    pronounForm.hidden = true;
    pronounAddButton.hidden = false;
}

/**
 * @param {SubmitEvent} event
 * @returns {Promise<void>}
 */
async function handlePronounSubmit(event) {
    event.preventDefault();
    if (!currentCharacterId) return;

    const formError = document.getElementById("pronoun-form-error");
    formError.textContent = "";

    const values = {
        subject: pronounField("subject").value,
        object: pronounField("object").value,
        possessive: pronounField("possessive").value,
        possessive_determiner: pronounField("possessive_determiner").value,
        reflexive: pronounField("reflexive").value,
        is_primary: pronounField("is_primary").checked,
    };

    const id = pronounFormId.value;
    const response = id
        ? await pronounsApi.update(id, values)
        : await pronounsApi.create({ character_id: currentCharacterId, ...values });

    if (!response.ok) {
        formError.textContent = await errorMessageFrom(response, "Save failed.");
        return;
    }

    closePronounForm();
    await refreshPronouns();
}

function renderCoverImage(images) {
    const coverContainer = element.querySelector(".modal-cover-image");
    coverContainer.innerHTML = "";

    const cover = images.find((image) => image.is_primary);
    if (!cover) return;

    const img = document.createElement("img");
    img.src = cover.url;
    img.alt = cover.caption ?? "Cover image";
    coverContainer.appendChild(img);
}

function buildGalleryItem(image) {
    const figure = document.createElement("figure");
    figure.className = "gallery-item";

    const img = document.createElement("img");
    img.src = image.url;
    img.alt = image.caption ?? "";
    figure.appendChild(img);

    if (image.is_primary) {
        const badge = document.createElement("span");
        badge.className = "gallery-primary-badge";
        badge.textContent = "★ cover";
        figure.appendChild(badge);
    }

    if (image.caption) {
        const caption = document.createElement("figcaption");
        caption.textContent = image.caption;
        figure.appendChild(caption);
    }

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "gallery-delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteImage(image.link_id));
    figure.appendChild(deleteButton);

    return figure;
}

function renderGallery(images) {
    const gallery = document.getElementById("modal-image-gallery");
    gallery.innerHTML = "";
    for (const image of images) {
        gallery.appendChild(buildGalleryItem(image));
    }
}

function renderImages(images) {
    renderCoverImage(images);
    renderGallery(images);
}

async function refreshGallery() {
    if (!currentCharacterId) return;
    renderImages(await imagesApi.listForCharacter(currentCharacterId));
}

async function deleteImage(linkId) {
    if (!confirm("Remove this image from the gallery? (It's archived, not permanently erased, unless this was its only link.)")) {
        return;
    }
    await imagesApi.deleteLink(linkId);
    await refreshGallery();
}

async function handleUploadSubmit(event) {
    event.preventDefault();
    if (!currentCharacterId) return;

    const form = event.target;
    const uploadError = document.getElementById("upload-error");
    uploadError.textContent = "";

    const response = await imagesApi.upload(currentCharacterId, new FormData(form));

    if (!response.ok) {
        uploadError.textContent = await errorMessageFrom(response, "Upload failed.");
        return;
    }

    form.reset();
    await refreshGallery();
}

/**
 * Open modal in view mode for an existing character.
 * @param {string|number} id - Character ID
 * @returns {Promise<void>}
 */
export async function openCharacterModal(id) {
    currentCharacterId = id;
    lastFetchedCharacter = await modal.openView(id);
    closePronounForm();
    await refreshPronouns();
    await refreshGallery();
}

/**
 * Open modal in create mode for a new character.
 * @returns {void}
 */
export function openNewCharacterModal() {
    currentCharacterId = null;
    lastFetchedCharacter = null;
    modal.openCreate();
}

document.getElementById("new-character-button").addEventListener("click", openNewCharacterModal);
element.querySelector(".modal-close").addEventListener("click", modal.close);
element.querySelector(".modal-edit").addEventListener("click", () => modal.enterEdit(lastFetchedCharacter));
element.querySelector(".modal-cancel").addEventListener("click", () => modal.cancelEdit(lastFetchedCharacter));
uploadForm.addEventListener("submit", handleUploadSubmit);
pronounAddButton.addEventListener("click", () => openPronounForm(null));
document.getElementById("pronoun-form-cancel").addEventListener("click", closePronounForm);
pronounForm.addEventListener("submit", handlePronounSubmit);
