import { HauntScenario } from "../../HauntScenario.js";
import { ActionType } from "../../action/ActionType.js";

export class RitualOfShadowsScenario extends HauntScenario {
    static meta = {
        id: "ritualOfShadows",
        title: "Ritual of Shadows",
        description: "Activate 3 altars to complete the ritual.",
        difficulty: 3,
        traitorRule: "random",
        objectives: {
            heroes: "Activate all 3 altars to complete the ritual.",
            traitor: "Stop the ritual. Kill all heroes."
        }
    };

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

    getActionAvailability(context, state) {
        const altarA = state.get("altarA") || false;
        const altarB = state.get("altarB") || false;
        const altarC = state.get("altarC") || false;
        const allActivated = altarA && altarB && altarC;
        return [
            { type: ActionType.ACTIVATE, enabled: !allActivated, reason: allActivated ? "Ritual complete" : null },
            { type: ActionType.END_TURN, enabled: true, reason: null }
        ];
    }
}
