// @ts-check

const THEME_STORAGE_KEY = "ocdb-theme";

/**
 * Get the current theme from localStorage.
 * @returns {string}
 */
function currentTheme() {
    return localStorage.getItem(THEME_STORAGE_KEY) || "auto";
}

/**
 * Set the current theme in localStorage and update the DOM.
 * @param {string} theme - Theme name (e.g. "light", "dark", "auto")
 * @returns {void}
 */
function setTheme(theme) {
    if (theme === "auto") {
        localStorage.removeItem(THEME_STORAGE_KEY);
        document.documentElement.removeAttribute("data-theme");
    } else {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        document.documentElement.setAttribute("data-theme", theme);
    }
}

const themeSelect = document.getElementById("theme-select");
if (themeSelect instanceof HTMLSelectElement) {
    themeSelect.value = currentTheme();
    themeSelect.addEventListener("change", () => setTheme(themeSelect.value));
}
