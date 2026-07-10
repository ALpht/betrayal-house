export class ScenarioFactoryResult {
    #runtime;
    #warnings;

    constructor({ runtime, warnings }) {
        this.#runtime = runtime;
        this.#warnings = warnings;
    }

    get runtime() {
        return this.#runtime;
    }

    get warnings() {
        return this.#warnings;
    }
}
