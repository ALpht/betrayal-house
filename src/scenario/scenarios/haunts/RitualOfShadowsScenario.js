import { HauntScenario } from "../../HauntScenario.js";

export class RitualOfShadowsScenario extends HauntScenario {
    static meta = { id: "ritualOfShadows", traitorRule: "random" };

    start(context, state) {
        super.start(context, state);
        state.set("altarA", false);
        state.set("altarB", false);
        state.set("altarC", false);
        state.set("heroesAlive", context.players?.getAllPlayers()?.length || 4);
    }
}
