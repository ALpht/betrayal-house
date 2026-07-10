import { HauntScenario } from "../../HauntScenario.js";
import { ActionType } from "../../action/ActionType.js";

export class RitualOfShadowsScenario extends HauntScenario {
    static meta = { id: "ritualOfShadows", traitorRule: "random" };

    start(context, state) {
        super.start(context, state);
        state.set("altarA", false);
        state.set("altarB", false);
        state.set("altarC", false);
        state.set("heroesAlive", context.players?.getAllPlayers()?.length || 4);
    }

    onAction(action, context, state) {
        if (action.type === ActionType.ACTIVATE) {
            if (action.payload?.altar === "altarA") state.set("altarA", true);
            if (action.payload?.altar === "altarB") state.set("altarB", true);
            if (action.payload?.altar === "altarC") state.set("altarC", true);
        }
    }

    getSupportedActions() {
        return [ActionType.ACTIVATE, ActionType.END_TURN];
    }
}
