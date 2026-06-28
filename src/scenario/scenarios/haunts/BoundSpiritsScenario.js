import { HauntScenario } from "../../HauntScenario.js";
import { InformationPacket } from "../../information/InformationPacket.js";
import { InformationAudience } from "../../information/InformationAudience.js";
import { InformationScope } from "../../information/InformationScope.js";

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
}
