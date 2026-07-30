// @ts-check

/**
 * @param {string} path - Request path
 * @param {Object} [opts] - Request options
 * @param {"GET"|"POST"|"PUT"|"DELETE"} [opts.method] - HTTP method; defaults to "GET"
 * @param {any} [opts.json] - JSON payload (sets Content-Type and stringifies)
 * @param {BodyInit} [opts.body] - Raw body (e.g. FormData for uploads)
 * @returns {Promise<Response>}
 */
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
    /**
     * @param {string} message - Error message
     * @param {number} status - HTTP status code
     */
    constructor(message, status) {
        super(message);
        this.status = status;
    }

    /** @type {number} */
    status;
}

/**
 * Parse response JSON or throw ApiError on non-ok status.
 * @param {Response} response
 * @returns {Promise<any>}
 * @throws {ApiError}
 */
async function parseJsonOrThrow(response) {
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(body.error ?? `Request failed (${response.status})`, response.status);
    }
    return response.json();
}

/**
 * @typedef {Object} EntityClient
 * @property {() => Promise<any>} list - GET all entities; returns parsed JSON
 * @property {(id: string|number) => Promise<any>} get - GET entity by id; returns parsed JSON
 * @property {(payload: object) => Promise<Response>} create - POST new entity; returns raw Response (check .ok)
 * @property {(id: string|number, payload: object) => Promise<Response>} update - PUT entity; returns raw Response (check .ok)
 * @property {(id: string|number) => Promise<Response>} remove - DELETE entity; returns raw Response (check .ok)
 */

/**
 * Factory for a CRUD client on a flat resource.
 * Note: list/get return parsed JSON; create/update/remove return raw Response objects
 * (caller must check .ok and parse errors manually).
 * @param {Object} opts
 * @param {string} opts.basePath - e.g. "/api/characters"
 * @returns {EntityClient}
 */
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

/**
 * @typedef {Object} PronounClient
 * @property {(characterId: string|number) => Promise<any>} listForCharacter - GET pronouns for character; returns parsed JSON
 */

/**
 * @typedef {Object} ImageClient
 * @property {(characterId: string|number) => Promise<any>} listForCharacter - GET images for character; returns parsed JSON
 * @property {(characterId: string|number, formData: FormData) => Promise<Response>} upload - POST image; returns raw Response (check .ok)
 * @property {(linkId: string|number) => Promise<Response>} deleteLink - DELETE image link; returns raw Response (check .ok)
 */

// Pronoun/image routes aren't uniformly nested (pronoun create is flat
// POST /api/pronouns with character_id in the body; list is nested under the
// character), so these stay hand-written rather than forced through a
// generic nested-resource client.

/** @type {PronounClient} */
export const pronouns = {
    listForCharacter: (characterId) =>
        request(`/api/characters/${characterId}/pronouns`).then(parseJsonOrThrow),
};

/** @type {ImageClient} */
export const images = {
    listForCharacter: (characterId) =>
        request(`/api/characters/${characterId}/images`).then(parseJsonOrThrow),
    upload: (characterId, formData) =>
        request(`/api/characters/${characterId}/images`, { method: "POST", body: formData }),
    deleteLink: (linkId) => request(`/api/image-links/${linkId}`, { method: "DELETE" }),
};
