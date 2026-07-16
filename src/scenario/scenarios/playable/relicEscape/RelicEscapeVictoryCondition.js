import { VictoryCondition } from "../../../victory/VictoryCondition.js";
import { VictoryResult } from "../../../victory/VictoryResult.js";

export class RelicEscapeVictoryCondition extends VictoryCondition {
    evaluate(context, state) {
        const collected = state.get("collectedRelicIds") || [];

        if (collected.length >= 3 && state.get("exitReached") === true) {
            return VictoryResult.heroes("relicEscape", "relics_escaped");
        }

        if ((state.get("turnsElapsed") || 0) >= 8) {
            return VictoryResult.traitor("relicEscape", "exit_sealed");
        }

        return null;
    }
}
