import { VictoryCondition } from "../../victory/VictoryCondition.js";
import { VictoryResult } from "../../victory/VictoryResult.js";

export class PuppetMasterVictoryCondition extends VictoryCondition {
    evaluate(context, state) {
        const dollsDestroyed = state.get("dollsDestroyed") || 0;
        if (dollsDestroyed >= 3) {
            return VictoryResult.heroes("puppetMaster", "boss_defeated");
        }

        const heroesAlive = state.get("heroesAlive");
        if (typeof heroesAlive === "number" && heroesAlive <= 0) {
            return VictoryResult.traitor("puppetMaster", "all_dead");
        }

        return null;
    }
}
