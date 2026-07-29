import { getCharacters } from "./api.js";
import { openCharacterModal } from "./character_modal.js";

export async function loadCharacters() {
    const characters = await getCharacters();

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
