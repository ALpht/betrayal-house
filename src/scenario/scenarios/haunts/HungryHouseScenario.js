import { HauntScenario } from "../../HauntScenario.js";

export class HungryHouseScenario extends HauntScenario {
    static meta = { id: "hungryHouse", traitorRule: "random" };

    start(context, state) {
        super.start(context, state);
        this._state = state;
        state.set("turnsElapsed", 0);
        state.set("heroInSafeRoom", false);
        state.set("maxTurns", 8);
    }

    onTurnEnd(context) {
        if (!this._state) return;
        const turns = this._state.get("turnsElapsed") || 0;
        this._state.set("turnsElapsed", turns + 1);
    }
}
