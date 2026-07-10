import { HauntScenario } from "../../HauntScenario.js";
import { InformationPacket } from "../../information/InformationPacket.js";
import { InformationAudience } from "../../information/InformationAudience.js";
import { InformationScope } from "../../information/InformationScope.js";
import { ActionType } from "../../action/ActionType.js";

export class BoundSpiritsScenario extends HauntScenario {
    static meta = { id: "boundSpirits", traitorRule: "random" };

    start(context, state) {
        super.start(context, state);
        state.set("spiritAlive", true);
        state.set("escortProgress", 0);
        state.set("spiritPosition", "entrance_0");

        const router = context.services?.get("router");
        if (!router) return;

        router.route(new InformationPacket({
            id: "boundSpirits_escort_position",
            audience: InformationAudience.HEROES_ONLY,
            scope: InformationScope.SCENARIO,
            payload: {
                text: "Escort the spirit to safety.",
                position: "entrance_0",
                progress: 0
            }
        }));

        router.route(new InformationPacket({
            id: "boundSpirits_traitor_objective",
            audience: InformationAudience.TRAITOR_ONLY,
            scope: InformationScope.OBJECTIVE,
            payload: {
                text: "Destroy the spirit before it reaches safety."
            }
        }));
    }

    onAction(action, context, state) {
        if (action.type === ActionType.INTERACT && action.payload?.type === "escort") {
            const progress = state.get("escortProgress") || 0;
            state.set("escortProgress", progress + 1);
        }
        if (action.type === ActionType.ATTACK && action.payload?.target === "spirit") {
            state.set("spiritAlive", false);
        }
    }

    getSupportedActions() {
        return [ActionType.INTERACT, ActionType.ATTACK, ActionType.END_TURN];
    }
}
