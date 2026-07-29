import { getCharacter, getPronouns, getImages, uploadImage, deleteImageLink } from "./api.js";
import { initModal } from "./modal.js";

const modal = document.getElementById("character-modal");
const modalName = document.getElementById("modal-character-name");
const modalDetails = document.getElementById("modal-character-details");
const modalClose = document.getElementById("character-modal-close");
const modalEdit = document.getElementById("character-modal-edit");
const uploadForm = document.getElementById("upload-form");

const modalCtl = initModal(modal);

let currentCharacterId = null;
let isEdit = false;

function formatPronoun(pronoun) {
    const base = `${pronoun.subject}/${pronoun.object}`;
    return pronoun.is_primary ? `${base} (primary)` : base;
}

function renderCharacterModal(character, pronouns) {
    modalName.textContent = character.name;

    const rows = [
        ["Age", character.age],
        ["Birthday", character.birthday ?? "Unknown"],
        ["Gender", character.gender],
        ["Sexuality", character.sexuality],
        ["Nationality", character.nationality ?? "Unknown"],
        [
            "Pronouns",
            pronouns.length ? pronouns.map(formatPronoun).join(", ") : "None set",
        ],
    ];

    if (character.extra && Object.keys(character.extra).length > 0) {
        rows.push(["Extra", JSON.stringify(character.extra)]);
    }

    modalDetails.innerHTML = "";
    for (const [label, value] of rows) {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = value;
        modalDetails.appendChild(dt);
        modalDetails.appendChild(dd);
    }
}

function renderCoverImage(images) {
    const coverContainer = document.getElementById("modal-cover-image");
    coverContainer.innerHTML = "";

    const cover = images.find((image) => image.is_primary);
    if (!cover) return;

    const img = document.createElement("img");
    img.src = cover.url;
    img.alt = cover.caption ?? "Cover image";
    coverContainer.appendChild(img);
}

function renderGallery(images) {
    const gallery = document.getElementById("modal-image-gallery");
    gallery.innerHTML = "";

    for (const image of images) {
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

        gallery.appendChild(figure);
    }
}

function renderImages(images) {
    renderCoverImage(images);
    renderGallery(images);
}

async function refreshGallery() {
    if (!currentCharacterId) return;
    renderImages(await getImages(currentCharacterId));
}

async function deleteImage(linkId) {
    if (!confirm("Remove this image from the gallery? (It's archived, not permanently erased, unless this was its only link.)")) {
        return;
    }
    await deleteImageLink(linkId);
    await refreshGallery();
}

async function handleUploadSubmit(event) {
    event.preventDefault();
    if (!currentCharacterId) return;

    const form = event.target;
    const uploadError = document.getElementById("upload-error");
    uploadError.textContent = "";

    const response = await uploadImage(currentCharacterId, new FormData(form));

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        uploadError.textContent = body.error ?? "Upload failed.";
        return;
    }

    form.reset();
    await refreshGallery();
}

export async function openCharacterModal(id) {
    currentCharacterId = id;
    const [character, pronouns, images] = await Promise.all([
        getCharacter(id),
        getPronouns(id),
        getImages(id),
    ]);

    renderCharacterModal(character, pronouns);
    renderImages(images);
    modalCtl.open();
}

modalEdit.addEventListener("click", () => {
    if (isEdit) {
        modalCtl.endEditing();
        isEdit = false;
    } else {
        modalCtl.edit();
        isEdit = true;
    }
});
modalClose.addEventListener("click", modalCtl.close);
uploadForm.addEventListener("submit", handleUploadSubmit);
