import { ScenarioLifecycleState }
    from "./ScenarioLifecycleState.js";

import { LifecycleError }
    from "./LifecycleError.js";

export class ScenarioLifecycle {
    #state = ScenarioLifecycleState.CREATED;

    getState() {
        return this.#state;
    }

    start() {
        this.#assertNotDestroyed("start");

        if (this.#state !== ScenarioLifecycleState.CREATED) {
            throw new LifecycleError(
                this.#state,
                "start"
            );
        }

        this.#state = ScenarioLifecycleState.STARTED;
    }

    pause() {
        this.#assertNotDestroyed("pause");

        if (this.#state !== ScenarioLifecycleState.STARTED) {
            throw new LifecycleError(
                this.#state,
                "pause"
            );
        }

        this.#state = ScenarioLifecycleState.PAUSED;
    }

    resume() {
        this.#assertNotDestroyed("resume");

        if (this.#state !== ScenarioLifecycleState.PAUSED) {
            throw new LifecycleError(
                this.#state,
                "resume"
            );
        }

        this.#state = ScenarioLifecycleState.STARTED;
    }

    complete() {
        this.#assertNotDestroyed("complete");

        if (this.#state === ScenarioLifecycleState.CREATED) {
            throw new LifecycleError(
                this.#state,
                "complete"
            );
        }

        if (this.#state === ScenarioLifecycleState.COMPLETED) {
            return;
        }

        this.#state = ScenarioLifecycleState.COMPLETED;
    }

    destroy() {
        if (this.#state === ScenarioLifecycleState.DESTROYED) {
            return;
        }

        this.#state = ScenarioLifecycleState.DESTROYED;
    }

    _forceState(state) {
        this.#state = state;
    }

    #assertNotDestroyed(method) {
        if (this.#state === ScenarioLifecycleState.DESTROYED) {
            throw new LifecycleError(
                this.#state,
                method
            );
        }
    }
}
