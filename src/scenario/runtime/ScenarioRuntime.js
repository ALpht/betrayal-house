import { InformationRouter }
    from "../information/InformationRouter.js";

import { ScenarioLifecycle }
    from "../lifecycle/ScenarioLifecycle.js";

import { ScenarioLifecycleState }
    from "../lifecycle/ScenarioLifecycleState.js";

export class ScenarioRuntime {
    #definition;
    #state;
    #context;
    #router;
    #lifecycle;
    #lastVictoryResult = null;

    constructor(definition, state, context, router = new InformationRouter()) {
        this.#definition = definition;
        this.#state = state;
        this.#context = context;
        this.#router = router;
        this.#lifecycle = new ScenarioLifecycle();
    }

    get definition() {
        return this.#definition;
    }

    get state() {
        return this.#state;
    }

    get context() {
        return this.#context;
    }

    get isActive() {
        return this.#lifecycle.getState()
            === ScenarioLifecycleState.STARTED;
    }

    get router() {
        return this.#router;
    }

    get scenarioId() {
        return this.#definition.getMeta().id;
    }

    getLifecycleState() {
        return this.#lifecycle.getState();
    }

    start() {
        this.#lifecycle.start();
        this.#definition.start(this.#context, this.#state);
    }

    pause() {
        this.#lifecycle.pause();
    }

    resume() {
        this.#lifecycle.resume();
    }

    complete() {
        this.#lifecycle.complete();
    }

    destroy() {
        if (this.#lifecycle.getState()
            === ScenarioLifecycleState.DESTROYED
        ) {
            return;
        }

        this.#router.clear();
        this.#lifecycle.destroy();
    }

    onTurnStart() {
        this.#definition.onTurnStart(this.#context);
    }

    onTurnEnd() {
        this.#definition.onTurnEnd(this.#context);
    }

    update() {
        this.#definition.update(this.#context);
    }

    handleAction(action) {
        this.#definition.onAction(action, this.#context, this.#state);
    }

    getSupportedActions() {
        return this.#definition.getSupportedActions();
    }

    getActionAvailability() {
        return this.#definition.getActionAvailability(this.#context, this.#state);
    }

    checkVictory() {
        const result = this.#definition.checkVictory(this.#context);
        this.#lastVictoryResult = result;
        return result;
    }

    getScenarioMetadata() {
        return this.#definition.getPresentationMetadata();
    }

    getVictoryResult() {
        return this.#lastVictoryResult;
    }

    toSnapshot() {
        return {
            scenarioId: this.scenarioId,
            lifecycleState: this.#lifecycle.getState(),
            state: this.#state.serialize(),
            information: this.#router.serialize()
        };
    }

    restoreFromSnapshot(snapshot) {
        this.#state.deserialize(snapshot.state);
        this.#router.deserialize(snapshot.information);

        const ls = snapshot.lifecycleState
            ?? (snapshot.active
                ? ScenarioLifecycleState.STARTED
                : ScenarioLifecycleState.CREATED);

        this.#lifecycle._forceState(ls);
    }
}
