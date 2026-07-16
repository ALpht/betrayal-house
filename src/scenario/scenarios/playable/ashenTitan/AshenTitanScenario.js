import { HauntScenario } from "../../../HauntScenario.js";
import { InformationPacket } from "../../../information/InformationPacket.js";
import { InformationAudience } from "../../../information/InformationAudience.js";
import { InformationScope } from "../../../information/InformationScope.js";
import { ActionType } from "../../../action/ActionType.js";

const ANCHOR_IDS = ["anchor_1", "anchor_2"];

export class AshenTitanScenario extends HauntScenario {
    #state = null;

    static meta = {
        id: "ashenTitan",
        title: "The Ashen Titan",
        description: "Break the Titan's anchors, then bring the monster down.",
        difficulty: 4,
        traitorRule: "random",
        objectives: {
            heroes: "Destroy both anchors and reduce the Titan to 0 HP.",
            traitor: "Keep the Titan alive until the heroes run out of time."
        }
    };

    start(context, state) {
        super.start(context, state);
        this.#state = state;
        state.set("bossHp", 12);
        state.set("destroyedAnchorIds", []);
        state.set("turnsElapsed", 0);

        const router = context.services?.get("router");
        if (!router) return;

        router.route(new InformationPacket({
            id: "ashenTitan_public_status",
            audience: InformationAudience.ALL_PLAYERS,
            scope: InformationScope.SCENARIO,
            payload: {
                text: "The Ashen Titan is shielded by two anchors.",
                bossHp: 12,
                anchors: 2
            }
        }));
    }

    onTurnEnd() {
        const turns = this.#state?.get("turnsElapsed") || 0;
        this.#state?.set("turnsElapsed", turns + 1);
    }

    onAction(action, context, state) {
        if (action.type === ActionType.ATTACK) {
            this.#attackTitan(action, state);
        }

        if (action.type === ActionType.DESTROY) {
            this.#destroyAnchor(action, state);
        }
    }

    getSupportedActions() {
        return [ActionType.ATTACK, ActionType.DESTROY, ActionType.END_TURN];
    }

    getActionAvailability(context, state) {
        const bossHp = state.get("bossHp") || 0;
        const destroyed = state.get("destroyedAnchorIds") || [];
        const floor = this.#bossHpFloor(destroyed.length);

        return [
            {
                type: ActionType.ATTACK,
                enabled: bossHp > floor,
                reason: bossHp <= floor ? "Anchors are shielding the Titan" : null
            },
            {
                type: ActionType.DESTROY,
                enabled: destroyed.length < ANCHOR_IDS.length,
                reason: destroyed.length >= ANCHOR_IDS.length ? "All anchors destroyed" : null
            },
            { type: ActionType.END_TURN, enabled: true, reason: null }
        ];
    }

    #attackTitan(action, state) {
        if (action.payload?.target !== "titan") {
            return;
        }

        const bossHp = state.get("bossHp") || 0;
        const destroyed = state.get("destroyedAnchorIds") || [];
        const floor = this.#bossHpFloor(destroyed.length);

        state.set("bossHp", Math.max(floor, bossHp - 1));
    }

    #destroyAnchor(action, state) {
        if (
            action.payload?.targetType !== "anchor"
            || !ANCHOR_IDS.includes(action.payload?.targetId)
        ) {
            return;
        }

        const destroyed = state.get("destroyedAnchorIds") || [];
        if (destroyed.includes(action.payload.targetId)) {
            return;
        }

        state.set(
            "destroyedAnchorIds",
            [...destroyed, action.payload.targetId]
        );
    }

    #bossHpFloor(anchorCount) {
        if (anchorCount <= 0) return 6;
        if (anchorCount === 1) return 1;
        return 0;
    }
}
