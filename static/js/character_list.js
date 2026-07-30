// @ts-check

import { characters as charactersApi } from "./api.js";
import { openCharacterModal } from "./character_entity.js";

/**
 * Fetch all characters and render them to the character list.
 * @returns {Promise<void>}
 */
export async function loadCharacters() {
    const characters = await charactersApi.list();

    const list = document.getElementById("character-list");
    list.innerHTML = "";

    for (const character of characters) {
        const item = document.createElement("li");
        const link = document.createElement("button");
        link.type = "button";
        link.className = "character-link";
        link.textContent = `${character.name} (${character.age})`;
        link.addEventListener("click", () => openCharacterModal(character.id));
        item.appendChild(link);
        list.appendChild(item);
    }
}
