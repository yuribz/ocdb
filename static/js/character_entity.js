// @ts-check

import { characters, images as imagesApi, pronouns as pronounsApi, errorMessageFrom } from "./api.js";
import { createEntityModal } from "./modal.js";
import { characterSchema } from "./entity_schemas.js";
import { loadCharacters } from "./character_list.js";

/** @type {HTMLElement} */
const element = document.getElementById("character-modal");
const uploadForm = document.getElementById("upload-form");

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

function renderPronounsIntoView(pronouns) {
    const view = element.querySelector(".modal-view");
    const dt = document.createElement("dt");
    dt.textContent = "Pronouns";
    const dd = document.createElement("dd");
    dd.textContent = pronouns.length ? pronouns.map(formatPronoun).join(", ") : "None set";
    view.appendChild(dt);
    view.appendChild(dd);
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
    const pronouns = await pronounsApi.listForCharacter(id);
    renderPronounsIntoView(pronouns);
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
