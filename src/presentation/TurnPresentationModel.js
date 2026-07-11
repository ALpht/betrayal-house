export class TurnPresentationModel {
    #currentPlayerName;

    constructor({ currentPlayerName }) {
        this.#currentPlayerName = currentPlayerName;
        Object.freeze(this);
    }

    get currentPlayerName() {
        return this.#currentPlayerName;
    }
}
