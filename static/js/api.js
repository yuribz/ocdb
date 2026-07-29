async function request(path, { method = "GET", json, body } = {}) {
    const opts = { method, headers: {} };
    if (json !== undefined) {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(json);
    } else if (body !== undefined) {
        opts.body = body; // e.g. FormData for uploads — browser sets Content-Type
    }
    return fetch(path, opts);
}

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

async function parseJsonOrThrow(response) {
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(body.error ?? `Request failed (${response.status})`, response.status);
    }
    return response.json();
}

// basePath: e.g. "/api/characters". Gives list/get/create/update/remove for a
// flat, uniformly-CRUD-by-id resource.
export function createEntityClient({ basePath }) {
    return {
        list: () => request(basePath).then(parseJsonOrThrow),
        get: (id) => request(`${basePath}/${id}`).then(parseJsonOrThrow),
        create: (payload) => request(basePath, { method: "POST", json: payload }),
        update: (id, payload) => request(`${basePath}/${id}`, { method: "PUT", json: payload }),
        remove: (id) => request(`${basePath}/${id}`, { method: "DELETE" }),
    };
}

export const characters = createEntityClient({ basePath: "/api/characters" });

// Pronoun/image routes aren't uniformly nested (pronoun create is flat
// POST /api/pronouns with character_id in the body; list is nested under the
// character), so these stay hand-written rather than forced through a
// generic nested-resource client.
export const pronouns = {
    listForCharacter: (characterId) =>
        request(`/api/characters/${characterId}/pronouns`).then(parseJsonOrThrow),
};

export const images = {
    listForCharacter: (characterId) =>
        request(`/api/characters/${characterId}/images`).then(parseJsonOrThrow),
    upload: (characterId, formData) =>
        request(`/api/characters/${characterId}/images`, { method: "POST", body: formData }),
    deleteLink: (linkId) => request(`/api/image-links/${linkId}`, { method: "DELETE" }),
};
