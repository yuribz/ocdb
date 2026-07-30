// @ts-check

import { places as placesApi } from "./api.js";
import { openPlaceModal } from "./place_entity.js";

/**
 * Fetch all places and render them to the place list.
 * @returns {Promise<void>}
 */
export async function loadPlaces() {
    const list = document.getElementById("place-list");
    list.innerHTML = "";

    let places;
    try {
        // /api/places doesn't exist yet on the backend (Places is still
        // work-in-progress) — fail quietly and leave the list empty rather
        // than surfacing an uncaught rejection on every page load.
        places = await placesApi.list();
    } catch {
        return;
    }

    for (const place of places) {
        const item = document.createElement("li");
        const link = document.createElement("button");
        link.type = "button";
        link.className = "place-link";
        link.textContent = `${place.name} (${place.place_type})`;
        link.addEventListener("click", () => openPlaceModal(place.id));
        item.appendChild(link);
        list.appendChild(item);
    }
}
