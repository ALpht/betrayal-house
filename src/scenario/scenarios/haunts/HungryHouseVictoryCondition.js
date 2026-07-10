import { VictoryCondition } from "../../victory/VictoryCondition.js";
import { VictoryResult } from "../../victory/VictoryResult.js";

export class HungryHouseVictoryCondition extends VictoryCondition {
    evaluate(context, state) {
        const heroInSafeRoom = state.get("heroInSafeRoom") === true;
        if (heroInSafeRoom) {
            return VictoryResult.heroes("hungryHouse", "escaped");
        }

        const turnsElapsed = state.get("turnsElapsed") || 0;
        const maxTurns = state.get("maxTurns") || 8;
        if (turnsElapsed >= maxTurns) {
            return VictoryResult.traitor("hungryHouse", "survived_turns");
        }

        return null;
    }
}
