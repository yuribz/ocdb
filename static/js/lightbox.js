// @ts-check

const element = /** @type {HTMLElement} */ (document.getElementById("image-lightbox"));
const image = /** @type {HTMLImageElement} */ (element.querySelector(".lightbox-image"));
const caption = /** @type {HTMLElement} */ (element.querySelector(".lightbox-caption"));

/**
 * Open the lightbox showing a full-size gallery image.
 * @param {string} src
 * @param {string} [captionText]
 * @returns {void}
 */
export function openLightbox(src, captionText = "") {
    image.src = src;
    image.alt = captionText;
    caption.textContent = captionText;
    element.hidden = false;
}

/**
 * @returns {void}
 */
export function closeLightbox() {
    element.hidden = true;
    image.src = "";
}

element.addEventListener("click", (event) => {
    if (event.target === element) closeLightbox();
});

element.querySelector(".lightbox-close").addEventListener("click", closeLightbox);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !element.hidden) closeLightbox();
});
