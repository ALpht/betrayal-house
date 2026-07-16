import { HauntScenario } from "../../../HauntScenario.js";
import { InformationPacket } from "../../../information/InformationPacket.js";
import { InformationAudience } from "../../../information/InformationAudience.js";
import { InformationScope } from "../../../information/InformationScope.js";
import { ActionType } from "../../../action/ActionType.js";

const NPC_MAX_WOUNDS = 2;

export class LostHeirScenario extends HauntScenario {
    #state = null;

    static meta = {
        id: "lostHeir",
        title: "The Lost Heir",
        description: "Escort the heir through the house before the traitor strikes.",
        difficulty: 3,
        traitorRule: "random",
        objectives: {
            heroes: "Escort the heir through four safe steps.",
            traitor: "Wound the heir twice or delay the heroes."
        }
    };

    start(context, state) {
        super.start(context, state);
        this.#state = state;
        state.set("escortProgress", 0);
        state.set("npcAlive", true);
        state.set("npcWounds", 0);
        state.set("turnsElapsed", 0);

        const router = context.services?.get("router");
        if (!router) return;

        router.route(new InformationPacket({
            id: "lostHeir_hero_objective",
            audience: InformationAudience.HEROES_ONLY,
            scope: InformationScope.OBJECTIVE,
            payload: {
                text: "Use INTERACT escort four times to guide the heir to safety.",
                escortNeeded: 4
            }
        }));

        router.route(new InformationPacket({
            id: "lostHeir_traitor_objective",
            audience: InformationAudience.TRAITOR_ONLY,
            scope: InformationScope.OBJECTIVE,
            payload: {
                text: "Attack the heir twice or delay the escort for 8 turns.",
                woundsNeeded: NPC_MAX_WOUNDS,
                turnLimit: 8
            }
        }));
    }

    onTurnEnd() {
        const turns = this.#state?.get("turnsElapsed") || 0;
        this.#state?.set("turnsElapsed", turns + 1);
    }

    onAction(action, context, state) {
        if (action.type === ActionType.INTERACT) {
            this.#escort(action, context, state);
        }

        if (action.type === ActionType.ATTACK) {
            this.#attackNpc(action, context, state);
        }
    }

    getSupportedActions() {
        return [ActionType.INTERACT, ActionType.ATTACK, ActionType.END_TURN];
    }

    getActionAvailability(context, state) {
        const npcAlive = state.get("npcAlive") === true;
        const escortProgress = state.get("escortProgress") || 0;
        const npcWounds = state.get("npcWounds") || 0;

        return [
            {
                type: ActionType.INTERACT,
                enabled: npcAlive && escortProgress < 4,
                reason: !npcAlive
                    ? "The heir is dead"
                    : escortProgress >= 4
                        ? "Escort complete"
                        : null
            },
            {
                type: ActionType.ATTACK,
                enabled: npcAlive && npcWounds < NPC_MAX_WOUNDS,
                reason: !npcAlive || npcWounds >= NPC_MAX_WOUNDS
                    ? "The heir is already defeated"
                    : null
            },
            { type: ActionType.END_TURN, enabled: true, reason: null }
        ];
    }

    #escort(action, context, state) {
        if (
            this.#isTraitor(action, context)
            || action.payload?.interactionType !== "escort"
            || state.get("npcAlive") !== true
        ) {
            return;
        }

        const progress = state.get("escortProgress") || 0;
        if (progress >= 4) {
            return;
        }

        state.set("escortProgress", progress + 1);
    }

    #attackNpc(action, context, state) {
        if (
            !this.#isTraitor(action, context)
            || action.payload?.target !== "npc"
            || state.get("npcAlive") !== true
        ) {
            return;
        }

        const wounds = (state.get("npcWounds") || 0) + 1;
        state.set("npcWounds", Math.min(NPC_MAX_WOUNDS, wounds));

        if (wounds >= NPC_MAX_WOUNDS) {
            state.set("npcAlive", false);
        }
    }

    #isTraitor(action, context) {
        return context.gameState?.getTraitorPlayerId?.() === action.playerId;
    }
}
