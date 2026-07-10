export class RegressionReport {
    #results;

    constructor(results = []) {
        this.#results = results;
    }

    get results() {
        return [...this.#results];
    }

    get total() {
        return this.#results.length;
    }

    get passed() {
        return this.#results.filter(r => r.passed).length;
    }

    get failed() {
        return this.#results.filter(r => !r.passed).length;
    }

    get warnings() {
        return this.#results.reduce((sum, r) => sum + r.warnings.length, 0);
    }

    toJSON() {
        return {
            total: this.total,
            passed: this.passed,
            failed: this.failed,
            warnings: this.warnings,
            results: this.#results.map(r => r.toJSON())
        };
    }
}