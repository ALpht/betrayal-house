import { EventBus } from "../../core/EventBus.js";
import { EventTypes } from "../../core/EventTypes.js";
import { VictoryResult } from "./VictoryResult.js";

export class VictoryController {
    #result = null;
    #handler;

    constructor() {
        this.#handler = this.#onScenarioCompleted.bind(this);
        EventBus.on(EventTypes.SCENARIO_COMPLETED, this.#handler);
    }

    destroy() {
        EventBus.off(EventTypes.SCENARIO_COMPLETED, this.#handler);
        this.#result = null;
    }

    getResult() { return this.#result; }
    hasResult() { return this.#result !== null; }

    restore(snapshot) {
        if (snapshot?.winner) {
            this.#result = VictoryResult.fromJSON(snapshot);
        }
    }

    #onScenarioCompleted(payload) {
        this.#result = new VictoryResult({
            scenarioId: payload.scenarioId,
            winner: payload.winner,
            reason: payload.reason
        });
        EventBus.emit(EventTypes.GAME_ENDED, this.#result.toJSON());
    }
}
