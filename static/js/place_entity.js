// @ts-check

import { places as placesApi } from "./api.js";
import { createEntityModal } from "./modal.js";
import { placesSchema } from "./entity_schemas.js";
import { loadPlaces } from "./place_list.js";

const element = /** @type {HTMLElement} */ (document.getElementById("place-modal"));

let lastFetchedPlace = null;

// No gallery layer here (unlike character_entity.js) — Places has no
// image-linking backend support.
const modal = createEntityModal({
    element,
    schema: placesSchema,
    client: placesApi,
    onSaved: (fresh) => {
        if (fresh) lastFetchedPlace = fresh;
        loadPlaces();
    },
});

/**
 * Open modal in view mode for an existing place.
 * @param {string|number} id - Place ID
 * @returns {Promise<void>}
 */
export async function openPlaceModal(id) {
    lastFetchedPlace = await modal.openView(id);
}

/**
 * Open modal in create mode for a new place.
 * @returns {void}
 */
export function openNewPlaceModal() {
    lastFetchedPlace = null;
    modal.openCreate();
}

document.getElementById("new-place-button").addEventListener("click", openNewPlaceModal);
element.querySelector(".modal-close").addEventListener("click", modal.close);
element.querySelector(".modal-edit").addEventListener("click", () => modal.enterEdit(lastFetchedPlace));
element.querySelector(".modal-cancel").addEventListener("click", () => modal.cancelEdit(lastFetchedPlace));
