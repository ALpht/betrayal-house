import { HauntScenario } from "../../HauntScenario.js";
import { ActionType } from "../../action/ActionType.js";

export class HungryHouseScenario extends HauntScenario {
    static meta = {
        id: "hungryHouse",
        title: "The Hungry House",
        description: "Reach the safe room before the house collapses.",
        difficulty: 3,
        traitorRule: "random",
        objectives: {
            heroes: "Reach the safe room within 8 turns.",
            traitor: "Survive until the house collapses."
        }
    };

    start(context, state) {
        super.start(context, state);
        state.set("turnsElapsed", 0);
        state.set("heroInSafeRoom", false);
        state.set("maxTurns", 8);
    }

    onAction(action, context, state) {
        if (action.type === ActionType.MOVE && action.payload?.destination === "safeRoom") {
            state.set("heroInSafeRoom", true);
        }
        if (action.type === ActionType.END_TURN) {
            const turns = state.get("turnsElapsed") || 0;
            state.set("turnsElapsed", turns + 1);
        }
    }

    getSupportedActions() {
        return [ActionType.MOVE, ActionType.END_TURN];
    }

    getActionAvailability(context, state) {
        const heroInSafeRoom = state.get("heroInSafeRoom") || false;
        const turnsElapsed = state.get("turnsElapsed") || 0;
        const maxTurns = state.get("maxTurns") || 8;

        return [
            { type: ActionType.MOVE, enabled: !heroInSafeRoom && turnsElapsed < maxTurns, reason: heroInSafeRoom ? "Already in safe room" : turnsElapsed >= maxTurns ? "Time ran out" : null },
            { type: ActionType.END_TURN, enabled: true, reason: null }
        ];
    }
}