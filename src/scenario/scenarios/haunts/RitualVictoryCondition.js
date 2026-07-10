import { VictoryCondition } from "../../victory/VictoryCondition.js";
import { VictoryResult } from "../../victory/VictoryResult.js";

export class RitualVictoryCondition extends VictoryCondition {
    evaluate(context, state) {
        const altarA = state.get("altarA") === true;
        const altarB = state.get("altarB") === true;
        const altarC = state.get("altarC") === true;

        if (altarA && altarB && altarC) {
            return VictoryResult.heroes("ritualOfShadows", "ritual_complete");
        }

        const heroesAlive = state.get("heroesAlive");
        if (typeof heroesAlive === "number" && heroesAlive <= 0) {
            return VictoryResult.traitor("ritualOfShadows", "all_dead");
        }

        return null;
    }
}
