export class ActionButton {
    #element;
    #action;

    constructor({ label, action, disabled = false }) {
        this.#action = action;
        this.#element = document.createElement("button");
        this.#element.textContent = label;
        this.#element.disabled = disabled;
    }

    get element() {
        return this.#element;
    }

    get action() {
        return this.#action;
    }

    setDisabled(disabled) {
        this.#element.disabled = disabled;
    }

    onClick(handler) {
        this.#element.addEventListener("click", handler);
    }

    remove() {
        this.#element.remove();
    }
}
