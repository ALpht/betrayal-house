export class ActionButton {
    #element;
    #action;
    #clickHandler;

    constructor({ label, action, disabled = false }) {
        this.#action = action;
        this.#element = document.createElement("button");
        this.#element.textContent = label;
        this.#element.disabled = disabled;
        this.#clickHandler = null;
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
        if (this.#clickHandler && typeof this.#element.removeEventListener === "function") {
            this.#element.removeEventListener("click", this.#clickHandler);
        }
        const wrapped = () => {
            if (this.#clickHandler === wrapped) {
                handler();
            }
        };
        this.#clickHandler = wrapped;
        this.#element.addEventListener("click", wrapped);
    }

    remove() {
        if (this.#clickHandler && typeof this.#element.removeEventListener === "function") {
            this.#element.removeEventListener("click", this.#clickHandler);
        }
        this.#clickHandler = null;
        this.#element.remove();
    }
}
