import { VictoryCondition } from "../../victory/VictoryCondition.js";
import { VictoryResult } from "../../victory/VictoryResult.js";

export class BoundSpiritsVictoryCondition extends VictoryCondition {
    evaluate(context, state) {
        const spiritAlive = state.get("spiritAlive") !== false;
        if (!spiritAlive) {
            return VictoryResult.traitor("boundSpirits", "all_dead");
        }

        const escortProgress = state.get("escortProgress") || 0;
        if (escortProgress >= 3) {
            return VictoryResult.heroes("boundSpirits", "escaped");
        }

        return null;
    }
}
