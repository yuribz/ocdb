// @ts-check

import { characters as charactersApi } from "./api.js";
import { openCharacterModal } from "./character_entity.js";

const list = /** @type {HTMLElement} */ (document.getElementById("character-list"));
const emptyState = /** @type {HTMLElement} */ (document.getElementById("character-empty-state"));
const searchInput = /** @type {HTMLInputElement} */ (document.getElementById("character-search"));

/** @type {any[]} */
let allCharacters = [];

/**
 * @param {string} name
 * @returns {string}
 */
function initialsFor(name) {
    return (name ?? "?").trim().charAt(0).toUpperCase() || "?";
}

/**
 * A stable, deterministic hue per name so the same character always gets the
 * same avatar color across reloads, without storing anything.
 * @param {string} name
 * @returns {number}
 */
function hueFor(name) {
    let hash = 0;
    for (const char of name ?? "") hash = (hash * 31 + char.charCodeAt(0)) % 360;
    return hash;
}

/**
 * @param {any} character
 * @returns {HTMLLIElement}
 */
function buildCharacterCard(character) {
    const item = document.createElement("li");
    const card = document.createElement("button");
    card.type = "button";
    card.className = "entity-card";
    card.addEventListener("click", () => openCharacterModal(character.id));

    const avatar = document.createElement("span");
    avatar.className = "entity-avatar";
    avatar.style.setProperty("--avatar-hue", String(hueFor(character.name)));
    avatar.textContent = initialsFor(character.name);
    card.appendChild(avatar);

    const details = document.createElement("span");
    details.className = "entity-card-details";

    const name = document.createElement("span");
    name.className = "entity-card-name";
    name.textContent = character.name;
    details.appendChild(name);

    const subtitle = document.createElement("span");
    subtitle.className = "entity-card-subtitle";
    subtitle.textContent = `Age ${character.age}`;
    details.appendChild(subtitle);

    card.appendChild(details);
    item.appendChild(card);
    return item;
}

/**
 * @returns {void}
 */
function renderSkeleton() {
    list.innerHTML = "";
    emptyState.hidden = true;
    for (let i = 0; i < 3; i++) {
        const item = document.createElement("li");
        item.className = "entity-card skeleton";
        list.appendChild(item);
    }
}

/**
 * @param {any[]} characters
 * @returns {void}
 */
function render(characters) {
    list.innerHTML = "";
    emptyState.hidden = characters.length > 0;
    for (const character of characters) {
        list.appendChild(buildCharacterCard(character));
    }
}

/**
 * @returns {void}
 */
function applyFilter() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = query
        ? allCharacters.filter((character) => character.name.toLowerCase().includes(query))
        : allCharacters;
    render(filtered);
}

/**
 * Fetch all characters and render them to the character list.
 * @returns {Promise<void>}
 */
export async function loadCharacters() {
    renderSkeleton();
    allCharacters = await charactersApi.list();
    applyFilter();
}

searchInput.addEventListener("input", applyFilter);
