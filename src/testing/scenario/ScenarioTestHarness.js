import { EventBus }
    from "../../core/EventBus.js";

export class ScenarioTestHarness {
    #runtime;
    #result = null;

    constructor(runtime) {
        this.#runtime = runtime;
    }

    get runtime() {
        return this.#runtime;
    }

    get state() {
        return this.#runtime.state;
    }

    get context() {
        return this.#runtime.context;
    }

    get result() {
        return this.#result;
    }

    start() {
        this.#runtime.start();
    }

    emit(eventName, payload = null) {
        EventBus.emit(eventName, payload);
    }

    checkVictory() {
        this.#result =
            this.#runtime.checkVictory();
        return this.#result;
    }

    destroy() {
        const scenario =
            this.#runtime.definition;

        if (
            scenario
            && typeof scenario.destroy
                === "function"
        ) {
            scenario.destroy();
        }
    }
}
