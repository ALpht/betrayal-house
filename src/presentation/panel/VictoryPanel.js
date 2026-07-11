import { VictoryState } from "../model/VictoryPresentationModel.js";

const VICTORY_LABELS = Object.freeze({
    [VictoryState.IN_PROGRESS]: "In Progress",
    [VictoryState.HEROES_WIN]: "Heroes Win!",
    [VictoryState.TRAITOR_WIN]: "Traitor Wins!"
});

export class VictoryPanel {
    #container;

    constructor({ container }) {
        this.#container = container;
    }

    render(model) {
        this.#container.textContent =
            VICTORY_LABELS[model.victoryState] || model.victoryState;
    }

    destroy() {
        this.#container.textContent = "";
    }
}
