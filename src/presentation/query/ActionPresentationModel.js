export class ActionPresentationModel {
    #actions;
    #scenarioId;

    constructor({ actions, scenarioId }) {
        this.#actions = Object.freeze(actions.map(a => Object.freeze(a)));
        this.#scenarioId = scenarioId;
    }

    get actions() {
        return this.#actions;
    }

    get scenarioId() {
        return this.#scenarioId;
    }
}