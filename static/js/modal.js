export function initModal(element, { onClose } = {}) {
    function close() {
        element.hidden = true;
        onClose?.();
    }

    function edit() {
        element.classList.add("editing");
    }

    function endEditing() {
        element.classList.remove("editing");
    }

    function open() {
        element.hidden = false;
    }

    element.addEventListener("click", (event) => {
        if (event.target === element) close();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !element.hidden) close();
    });

    return { open, close, edit, endEditing };
}
