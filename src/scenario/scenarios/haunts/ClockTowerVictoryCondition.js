import { VictoryCondition } from "../../victory/VictoryCondition.js";
import { VictoryResult } from "../../victory/VictoryResult.js";

export class ClockTowerVictoryCondition extends VictoryCondition {
    evaluate(context, state) {
        const bossHp = state.get("bossHp");
        if (typeof bossHp === "number" && bossHp <= 0) {
            return VictoryResult.heroes("clockTower", "boss_defeated");
        }

        const allDead = state.get("allHeroesDead") === true;
        if (allDead) {
            return VictoryResult.traitor("clockTower", "all_dead");
        }

        return null;
    }
}
