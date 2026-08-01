// @ts-check

import { places as placesApi } from "./api.js";
import { openPlaceModal } from "./place_entity.js";

const list = /** @type {HTMLElement} */ (document.getElementById("place-list"));
const emptyState = /** @type {HTMLElement} */ (document.getElementById("place-empty-state"));
const searchInput = /** @type {HTMLInputElement} */ (document.getElementById("place-search"));

/** @type {any[]} */
let allPlaces = [];

/**
 * @param {string} name
 * @returns {string}
 */
function initialsFor(name) {
    return (name ?? "?").trim().charAt(0).toUpperCase() || "?";
}

/**
 * A stable, deterministic hue per name so the same place always gets the
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
 * @param {any} place
 * @returns {HTMLLIElement}
 */
function buildPlaceCard(place) {
    const item = document.createElement("li");
    const card = document.createElement("button");
    card.type = "button";
    card.className = "entity-card";
    card.addEventListener("click", () => openPlaceModal(place.id));

    const avatar = document.createElement("span");
    avatar.className = "entity-avatar";
    avatar.style.setProperty("--avatar-hue", String(hueFor(place.name)));
    avatar.textContent = initialsFor(place.name);
    card.appendChild(avatar);

    const details = document.createElement("span");
    details.className = "entity-card-details";

    const name = document.createElement("span");
    name.className = "entity-card-name";
    name.textContent = place.name;
    details.appendChild(name);

    const subtitle = document.createElement("span");
    subtitle.className = "entity-card-subtitle";
    subtitle.textContent = place.place_type;
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
 * @param {any[]} places
 * @returns {void}
 */
function render(places) {
    list.innerHTML = "";
    emptyState.hidden = places.length > 0;
    for (const place of places) {
        list.appendChild(buildPlaceCard(place));
    }
}

/**
 * @returns {void}
 */
function applyFilter() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = query
        ? allPlaces.filter((place) => place.name.toLowerCase().includes(query))
        : allPlaces;
    render(filtered);
}

/**
 * Fetch all places and render them to the place list.
 * @returns {Promise<void>}
 */
export async function loadPlaces() {
    renderSkeleton();

    try {
        // /api/places doesn't exist yet on the backend (Places is still
        // work-in-progress) — fail quietly into the empty state rather than
        // surfacing an uncaught rejection on every page load.
        allPlaces = await placesApi.list();
    } catch {
        allPlaces = [];
    }

    applyFilter();
}

searchInput.addEventListener("input", applyFilter);
