export class RegressionScenarioResult {
    #scenarioId;
    #passed;
    #snapshot;
    #warnings;
    #error;

    constructor({ scenarioId, passed, snapshot = null, warnings = [], error = null }) {
        this.#scenarioId = scenarioId;
        this.#passed = passed;
        this.#snapshot = snapshot;
        this.#warnings = warnings;
        this.#error = error;
    }

    get scenarioId() { return this.#scenarioId; }
    get passed() { return this.#passed; }
    get snapshot() { return this.#snapshot; }
    get warnings() { return [...this.#warnings]; }
    get error() { return this.#error; }

    toJSON() {
        return {
            scenarioId: this.#scenarioId,
            passed: this.#passed,
            warnings: this.#warnings.length,
            error: this.#error ? this.#error.message : null
        };
    }
}