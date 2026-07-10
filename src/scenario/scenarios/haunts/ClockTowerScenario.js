import { HauntScenario } from "../../HauntScenario.js";
import { InformationPacket } from "../../information/InformationPacket.js";
import { InformationAudience } from "../../information/InformationAudience.js";
import { InformationScope } from "../../information/InformationScope.js";
import { ActionType } from "../../action/ActionType.js";

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

    onAction(action, context, state) {
        if (action.type === ActionType.ATTACK) {
            const hp = state.get("bossHp") || 0;
            state.set("bossHp", Math.max(0, hp - 1));
        }
        if (action.type === ActionType.COLLECT) {
            const parts = state.get("partsFound") || 0;
            state.set("partsFound", parts + 1);
        }
    }

    getSupportedActions() {
        return [ActionType.ATTACK, ActionType.COLLECT, ActionType.END_TURN];
    }

    getActionAvailability(context, state) {
        const bossHp = state.get("bossHp") || 0;
        const partsFound = state.get("partsFound") || 0;

        return [
            { type: ActionType.ATTACK, enabled: bossHp > 0, reason: bossHp <= 0 ? "Boss defeated" : null },
            { type: ActionType.COLLECT, enabled: partsFound < 4, reason: partsFound >= 4 ? "All parts collected" : null },
            { type: ActionType.END_TURN, enabled: true, reason: null }
        ];
    }
}