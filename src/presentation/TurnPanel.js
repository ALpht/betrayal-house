export class TurnPanel {
    #container;

    constructor({ container }) {
        this.#container = container;
    }

    render(model) {
        this.#container.textContent = model.currentPlayerName;
    }

    destroy() {
        this.#container.textContent = "";
    }
}
