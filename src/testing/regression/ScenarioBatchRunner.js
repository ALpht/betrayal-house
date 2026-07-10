import { RegressionReport }
    from "./RegressionReport.js";

export class ScenarioBatchRunner {
    #catalog;
    #runner;

    constructor({ catalog, runner }) {
        this.#catalog = catalog;
        this.#runner = runner;
    }

    runAll() {
        return this.#execute(this.#catalog.getAll());
    }

    run(ids) {
        const defs = ids
            .map(id => this.#catalog.get(id))
            .filter(Boolean);
        return this.#execute(defs);
    }

    runByTag(tag) {
        return this.#execute(this.#catalog.findByTag(tag));
    }

    runByDifficulty(level) {
        return this.#execute(this.#catalog.findByDifficulty(level));
    }

    #execute(definitions) {
        const results = [];

        for (const def of definitions) {
            const result = this.#runner.run(def);
            results.push(result);
        }

        return new RegressionReport(results);
    }
}