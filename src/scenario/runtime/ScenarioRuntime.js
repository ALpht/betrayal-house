export class ScenarioRuntime {
    #definition;
    #state;
    #context;
    #active;

    constructor(definition, state, context) {
        this.#definition = definition;
        this.#state = state;
        this.#context = context;
        this.#active = false;
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
        return this.#active;
    }

    get scenarioId() {
        return this.#definition.getMeta().id;
    }

    start() {
        this.#active = true;
        this.#definition.start(this.#context, this.#state);
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

    checkVictory() {
        return this.#definition.checkVictory(this.#context);
    }

    toSnapshot() {
        return {
            scenarioId: this.scenarioId,
            active: this.#active,
            state: this.#state.serialize()
        };
    }

    restoreFromSnapshot(snapshot) {
        this.#state.deserialize(snapshot.state);
        this.#active = snapshot.active ?? true;
    }
}
