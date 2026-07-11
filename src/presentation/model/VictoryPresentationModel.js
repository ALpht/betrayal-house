export const VictoryState = Object.freeze({
    IN_PROGRESS: "in_progress",
    HEROES_WIN: "heroes_win",
    TRAITOR_WIN: "traitor_win"
});

export class VictoryPresentationModel {
    #victoryState;
    #winner;
    #scenarioId;

    constructor({ victoryState, winner, scenarioId }) {
        this.#victoryState = victoryState;
        this.#winner = winner;
        this.#scenarioId = scenarioId;
        Object.freeze(this);
    }

    get victoryState() {
        return this.#victoryState;
    }

    get winner() {
        return this.#winner;
    }

    get scenarioId() {
        return this.#scenarioId;
    }
}
