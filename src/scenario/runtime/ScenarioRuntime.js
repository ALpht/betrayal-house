import { InformationRouter }
    from "../information/InformationRouter.js";

export class ScenarioRuntime {
    #definition;
    #state;
    #context;
    #router;
    #active;

    constructor(definition, state, context, router = new InformationRouter()) {
        this.#definition = definition;
        this.#state = state;
        this.#context = context;
        this.#router = router;
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

    get router() {
        return this.#router;
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
            state: this.#state.serialize(),
            information: this.#router.serialize()
        };
    }

    restoreFromSnapshot(snapshot) {
        this.#state.deserialize(snapshot.state);
        this.#router.deserialize(snapshot.information);
        this.#active = snapshot.active ?? true;
    }
}
