export class ScenarioObjectives {
    #heroes;
    #traitor;

    constructor({ heroes, traitor }) {
        this.#heroes = heroes;
        this.#traitor = traitor;
    }

    get heroes() { return this.#heroes; }
    get traitor() { return this.#traitor; }

    toJSON() {
        return {
            heroes: this.#heroes,
            traitor: this.#traitor
        };
    }

    static fromJSON(json) {
        return new ScenarioObjectives(json);
    }
}
