export async function getCharacters() {
    const response = await fetch("/api/characters");
    return response.json();
}

export async function getCharacter(id) {
    const response = await fetch(`/api/characters/${id}`);
    return response.json();
}

export async function getPronouns(id) {
    const response = await fetch(`/api/characters/${id}/pronouns`);
    return response.json();
}

export async function getImages(id) {
    const response = await fetch(`/api/characters/${id}/images`);
    return response.json();
}

export async function createCharacter(payload) {
    return fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
}

export async function updateCharacter(payload) {
    return fetch("/api/characters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
}

export async function uploadImage(characterId, formData) {
    return fetch(`/api/characters/${characterId}/images`, {
        method: "POST",
        body: formData,
    });
}

export async function deleteImageLink(linkId) {
    return fetch(`/api/image-links/${linkId}`, { method: "DELETE" });
}
