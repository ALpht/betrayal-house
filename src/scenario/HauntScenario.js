export class HauntScenario {
    #state = null;
    #victoryCondition = null;

    static meta = { id: "unknown" };

    getMeta() {
        return this.constructor.meta;
    }

    start(context, state) {
        this.#state = state;
    }

    onTurnStart(context) {}
    onTurnEnd(context) {}
    update(context) {}

    onAction(action, context, state) {}

    getSupportedActions() {
        return [];
    }

    getActionAvailability(context, state) {
        return this.getSupportedActions().map(type => ({
            type,
            enabled: true,
            reason: null
        }));
    }

    getVictoryCondition() {
        return this.#victoryCondition;
    }

    setVictoryCondition(instance) {
        this.#victoryCondition = instance;
    }

    checkVictory(context) {
        if (!this.#victoryCondition) return null;
        const result = this.#victoryCondition.evaluate(context, this.#state);
        return result ? result.toJSON() : null;
    }
}