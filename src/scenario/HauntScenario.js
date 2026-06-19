export class HauntScenario {

    static meta = {
        id: "unknown"
    };

    getMeta() {
        return this.constructor.meta;
    }

    /**
     * @param {import("./runtime/ScenarioContext.js").ScenarioContext} context
     * @param {import("./runtime/ScenarioState.js").ScenarioState} state
     */
    start(context, state) {}

    onTurnStart(context) {}

    onTurnEnd(context) {}

    update(context) {}

    /**
     * @returns {Object|null}
     *   null — game continues
     *   { completed: true, winner: "heroes" | "traitor" | string } — game ended
     */
    checkVictory(context) {
        return null;
    }

}
