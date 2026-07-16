import { VictoryCondition } from "../../../victory/VictoryCondition.js";
import { VictoryResult } from "../../../victory/VictoryResult.js";

export class AshenTitanVictoryCondition extends VictoryCondition {
    evaluate(context, state) {
        const destroyed = state.get("destroyedAnchorIds") || [];

        if ((state.get("bossHp") || 0) <= 0 && destroyed.length >= 2) {
            return VictoryResult.heroes("ashenTitan", "titan_defeated");
        }

        if ((state.get("turnsElapsed") || 0) >= 10) {
            return VictoryResult.traitor("ashenTitan", "titan_survived");
        }

        return null;
    }
}
