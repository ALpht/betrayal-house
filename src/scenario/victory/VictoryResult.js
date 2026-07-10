import { WINNER, REASON } from "./VictoryTypes.js";

export class VictoryResult {
    #scenarioId;
    #winner;
    #reason;

    constructor({ scenarioId, winner, reason }) {
        this.#scenarioId = scenarioId;
        this.#winner = winner;
        this.#reason = reason || REASON.UNKNOWN;
    }

    get scenarioId() { return this.#scenarioId; }
    get winner() { return this.#winner; }
    get reason() { return this.#reason; }

    toJSON() {
        return {
            scenarioId: this.#scenarioId,
            winner: this.#winner,
            reason: this.#reason
        };
    }

    static fromJSON(json) {
        return new VictoryResult({
            scenarioId: json.scenarioId,
            winner: json.winner,
            reason: json.reason
        });
    }

    static heroes(scenarioId, reason) {
        return new VictoryResult({
            scenarioId,
            winner: WINNER.HEROES,
            reason
        });
    }

    static traitor(scenarioId, reason) {
        return new VictoryResult({
            scenarioId,
            winner: WINNER.TRAITOR,
            reason
        });
    }
}
