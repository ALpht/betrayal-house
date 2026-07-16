import { HauntScenario } from "../../../HauntScenario.js";
import { InformationPacket } from "../../../information/InformationPacket.js";
import { InformationAudience } from "../../../information/InformationAudience.js";
import { InformationScope } from "../../../information/InformationScope.js";
import { ActionType } from "../../../action/ActionType.js";

const MASK_IDS = ["cursed_mask_1", "cursed_mask_2"];

export class MaskedHostScenario extends HauntScenario {
    #state = null;

    static meta = {
        id: "maskedHost",
        title: "The Masked Host",
        description: "Find clues, reveal the traitor, and destroy the cursed masks.",
        difficulty: 4,
        traitorRule: "random",
        objectives: {
            heroes: "Find three clues, reveal the traitor, then destroy two cursed masks.",
            traitor: "Keep your identity hidden long enough for the masquerade to end."
        }
    };

    start(context, state) {
        super.start(context, state);
        this.#state = state;
        state.set("cluesFound", 0);
        state.set("traitorRevealed", false);
        state.set("destroyedCursedMaskIds", []);
        state.set("turnsElapsed", 0);

        const router = context.services?.get("router");
        if (!router) return;

        router.route(new InformationPacket({
            id: "maskedHost_hero_objective",
            audience: InformationAudience.HEROES_ONLY,
            scope: InformationScope.OBJECTIVE,
            payload: {
                text: "Collect three clues, reveal the traitor, then destroy two cursed masks.",
                cluesNeeded: 3,
                masksNeeded: 2
            }
        }));

        router.route(new InformationPacket({
            id: "maskedHost_traitor_objective",
            audience: InformationAudience.TRAITOR_ONLY,
            scope: InformationScope.OBJECTIVE,
            payload: {
                text: "Stay hidden until the masquerade ends after 9 turns.",
                turnLimit: 9
            }
        }));
    }

    onTurnEnd() {
        const turns = this.#state?.get("turnsElapsed") || 0;
        this.#state?.set("turnsElapsed", turns + 1);
    }

    onAction(action, context, state) {
        if (action.type === ActionType.COLLECT) {
            this.#collectClue(action, context, state);
        }

        if (action.type === ActionType.INTERACT) {
            this.#revealTraitor(action, context, state);
        }

        if (action.type === ActionType.DESTROY) {
            this.#destroyCursedMask(action, context, state);
        }
    }

    getSupportedActions() {
        return [
            ActionType.COLLECT,
            ActionType.INTERACT,
            ActionType.DESTROY,
            ActionType.END_TURN
        ];
    }

    getActionAvailability(context, state) {
        const cluesFound = state.get("cluesFound") || 0;
        const traitorRevealed = state.get("traitorRevealed") === true;
        const destroyedMasks = state.get("destroyedCursedMaskIds") || [];

        return [
            {
                type: ActionType.COLLECT,
                enabled: cluesFound < 3,
                reason: cluesFound >= 3 ? "All clues found" : null
            },
            {
                type: ActionType.INTERACT,
                enabled: cluesFound >= 3 && !traitorRevealed,
                reason: traitorRevealed
                    ? "Traitor already revealed"
                    : cluesFound < 3
                        ? "Find three clues first"
                        : null
            },
            {
                type: ActionType.DESTROY,
                enabled: traitorRevealed && destroyedMasks.length < MASK_IDS.length,
                reason: !traitorRevealed
                    ? "Reveal the traitor first"
                    : destroyedMasks.length >= MASK_IDS.length
                        ? "All cursed masks destroyed"
                        : null
            },
            { type: ActionType.END_TURN, enabled: true, reason: null }
        ];
    }

    #collectClue(action, context, state) {
        if (this.#isTraitor(action, context) || action.payload?.itemId !== "clue") {
            return;
        }

        const cluesFound = state.get("cluesFound") || 0;
        state.set("cluesFound", Math.min(3, cluesFound + 1));
    }

    #revealTraitor(action, context, state) {
        if (
            this.#isTraitor(action, context)
            || action.payload?.interactionType !== "revealTraitor"
            || (state.get("cluesFound") || 0) < 3
        ) {
            return;
        }

        state.set("traitorRevealed", true);
    }

    #destroyCursedMask(action, context, state) {
        if (
            this.#isTraitor(action, context)
            || state.get("traitorRevealed") !== true
            || action.payload?.targetType !== "cursedMask"
            || !MASK_IDS.includes(action.payload?.targetId)
        ) {
            return;
        }

        const destroyed = state.get("destroyedCursedMaskIds") || [];
        if (destroyed.includes(action.payload.targetId)) {
            return;
        }

        state.set(
            "destroyedCursedMaskIds",
            [...destroyed, action.payload.targetId]
        );
    }

    #isTraitor(action, context) {
        return context.gameState?.getTraitorPlayerId?.() === action.playerId;
    }
}
