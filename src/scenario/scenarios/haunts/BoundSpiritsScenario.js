import { HauntScenario } from "../../HauntScenario.js";
import { InformationPacket } from "../../information/InformationPacket.js";
import { InformationAudience } from "../../information/InformationAudience.js";
import { InformationScope } from "../../information/InformationScope.js";
import { ActionType } from "../../action/ActionType.js";

export class BoundSpiritsScenario extends HauntScenario {
    static meta = {
        id: "boundSpirits",
        title: "Bound Spirits",
        description: "Escort the spirit to safety before it is destroyed.",
        difficulty: 2,
        traitorRule: "random",
        objectives: {
            heroes: "Escort the spirit to safety.",
            traitor: "Destroy the bound spirit."
        }
    };

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

    getActionAvailability(context, state) {
        const spiritAlive = state.get("spiritAlive") !== false;
        const escortProgress = state.get("escortProgress") || 0;
        return [
            { type: ActionType.INTERACT, enabled: spiritAlive && escortProgress < 3, reason: !spiritAlive ? "Spirit destroyed" : escortProgress >= 3 ? "Escort complete" : null },
            { type: ActionType.ATTACK, enabled: spiritAlive, reason: !spiritAlive ? "Spirit already destroyed" : null },
            { type: ActionType.END_TURN, enabled: true, reason: null }
        ];
    }
}
