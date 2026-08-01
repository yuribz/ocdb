// @ts-check

/**
 * @typedef {"success"|"error"} ToastType
 */

const AUTO_DISMISS_MS = 3200;

/**
 * @returns {HTMLElement}
 */
function container() {
    return /** @type {HTMLElement} */ (document.getElementById("toast-container"));
}

/**
 * Show a brief, non-blocking confirmation toast. Layered on top of (not a
 * replacement for) the inline form-error text modals already show — this is
 * for success feedback and one-line errors that don't have a form to sit in.
 * @param {string} message
 * @param {Object} [opts]
 * @param {ToastType} [opts.type] - defaults to "success"
 * @returns {void}
 */
export function showToast(message, { type = "success" } = {}) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute("role", "status");

    container().appendChild(toast);

    // Two rAFs so the browser commits the initial (offscreen) state before
    // the transition-triggering class is added — a single rAF can still land
    // in the same style-recalc frame and skip the transition.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add("toast-visible"));
    });

    setTimeout(() => dismiss(toast), AUTO_DISMISS_MS);
}

/**
 * @param {HTMLElement} toast
 * @returns {void}
 */
function dismiss(toast) {
    toast.classList.remove("toast-visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
}
