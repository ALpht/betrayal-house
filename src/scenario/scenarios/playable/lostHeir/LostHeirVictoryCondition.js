import { VictoryCondition } from "../../../victory/VictoryCondition.js";
import { VictoryResult } from "../../../victory/VictoryResult.js";

export class LostHeirVictoryCondition extends VictoryCondition {
    evaluate(context, state) {
        if (state.get("npcAlive") === false) {
            return VictoryResult.traitor("lostHeir", "heir_lost");
        }

        if ((state.get("escortProgress") || 0) >= 4) {
            return VictoryResult.heroes("lostHeir", "heir_escorted");
        }

        if ((state.get("turnsElapsed") || 0) >= 8) {
            return VictoryResult.traitor("lostHeir", "escort_failed");
        }

        return null;
    }
}
