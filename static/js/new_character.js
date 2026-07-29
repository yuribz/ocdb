import { createCharacter } from "./api.js";
import { initModal } from "./modal.js";
import { loadCharacters } from "./character_list.js";

const newCharacterModal = document.getElementById("new-character-modal");
const newCharacterButton = document.getElementById("new-character-button");
const newCharacterClose = document.getElementById("new-character-close");
const newCharacterForm = document.getElementById("new-character-form");
const newCharacterError = document.getElementById("new-character-error");

const modalCtl = initModal(newCharacterModal);

async function handleNewCharacterSubmit(event) {
    event.preventDefault();

    const form = event.target;
    newCharacterError.textContent = "";

    const formData = new FormData(form);
    const payload = {
        name: formData.get("name"),
        age: Number(formData.get("age")),
        birthday: formData.get("birthday") || null,
        gender: formData.get("gender"),
        sexuality: formData.get("sexuality"),
        nationality: formData.get("nationality") || null,
    };

    const response = await createCharacter(payload);

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        newCharacterError.textContent = body.error ?? "Failed to create character.";
        return;
    }

    modalCtl.close();
    await loadCharacters();
}

newCharacterButton.addEventListener("click", () => {
    newCharacterForm.reset();
    newCharacterError.textContent = "";
    modalCtl.open();
});
newCharacterClose.addEventListener("click", modalCtl.close);
newCharacterForm.addEventListener("submit", handleNewCharacterSubmit);
