export class HauntScenario {
    #state = null;
    #victoryCondition = null;

    static meta = { id: "unknown" };

    getMeta() {
        return this.constructor.meta;
    }

    getPresentationMetadata() {
        const meta = this.getMeta();
        return {
            id: meta.id,
            title: meta.title || meta.id,
            description: meta.description || "",
            difficulty: meta.difficulty || 1,
            objectives: meta.objectives || null
        };
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