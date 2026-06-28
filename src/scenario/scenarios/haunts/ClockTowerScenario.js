import { HauntScenario } from "../../HauntScenario.js";
import { InformationPacket } from "../../information/InformationPacket.js";
import { InformationAudience } from "../../information/InformationAudience.js";
import { InformationScope } from "../../information/InformationScope.js";

export class ClockTowerScenario extends HauntScenario {
    static meta = { id: "clockTower", traitorRule: "random" };

    start(context, state) {
        super.start(context, state);
        state.set("bossHp", 10);
        state.set("partsFound", 0);
        state.set("allHeroesDead", false);

        const router = context.services?.get("router");
        if (!router) return;

        router.route(new InformationPacket({
            id: "clockTower_boss_hp",
            audience: InformationAudience.ALL_PLAYERS,
            scope: InformationScope.SCENARIO,
            payload: {
                text: "Clockwork Golem HP",
                bossHp: 10
            }
        }));

        router.route(new InformationPacket({
            id: "clockTower_hero_objective",
            audience: InformationAudience.HEROES_ONLY,
            scope: InformationScope.OBJECTIVE,
            payload: {
                text: "Defeat the Clockwork Golem. Find 4 clock parts to weaken it.",
                partsNeeded: 4
            }
        }));
    }
}
