const THEME_STORAGE_KEY = "ocdb-theme";

function currentTheme() {
    return localStorage.getItem(THEME_STORAGE_KEY) || "auto";
}

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
if (themeSelect) {
    themeSelect.value = currentTheme();
    themeSelect.addEventListener("change", () => setTheme(themeSelect.value));
}
