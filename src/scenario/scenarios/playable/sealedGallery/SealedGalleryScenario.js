import { HauntScenario } from "../../../HauntScenario.js";
import { InformationPacket } from "../../../information/InformationPacket.js";
import { InformationAudience } from "../../../information/InformationAudience.js";
import { InformationScope } from "../../../information/InformationScope.js";
import { ActionType } from "../../../action/ActionType.js";

const SEQUENCE = ["moon", "key", "flame"];

export class SealedGalleryScenario extends HauntScenario {
    #state = null;

    static meta = {
        id: "sealedGallery",
        title: "The Sealed Gallery",
        description: "Collect symbols and activate the gallery altars in order.",
        difficulty: 3,
        traitorRule: "random",
        objectives: {
            heroes: "Collect three symbols and activate moon, key, and flame in order.",
            traitor: "Force three mistakes or delay the puzzle for 10 turns."
        }
    };

    start(context, state) {
        super.start(context, state);
        this.#state = state;
        state.set("symbolsCollected", 0);
        state.set("sequenceIndex", 0);
        state.set("mistakes", 0);
        state.set("turnsElapsed", 0);

        const router = context.services?.get("router");
        if (!router) return;

        router.route(new InformationPacket({
            id: "sealedGallery_order",
            audience: InformationAudience.ALL_PLAYERS,
            scope: InformationScope.SCENARIO,
            payload: {
                text: "The carved order reads: moon, key, flame.",
                sequence: SEQUENCE
            }
        }));
    }

    onTurnEnd() {
        const turns = this.#state?.get("turnsElapsed") || 0;
        this.#state?.set("turnsElapsed", turns + 1);
    }

    onAction(action, context, state) {
        if (action.type === ActionType.COLLECT) {
            this.#collectSymbol(action, state);
        }

        if (action.type === ActionType.ACTIVATE) {
            this.#activateAltar(action, state);
        }
    }

    getSupportedActions() {
        return [ActionType.COLLECT, ActionType.ACTIVATE, ActionType.END_TURN];
    }

    getActionAvailability(context, state) {
        const symbols = state.get("symbolsCollected") || 0;
        const sequenceIndex = state.get("sequenceIndex") || 0;

        return [
            {
                type: ActionType.COLLECT,
                enabled: symbols < 3,
                reason: symbols >= 3 ? "All symbols collected" : null
            },
            {
                type: ActionType.ACTIVATE,
                enabled: symbols >= 3 && sequenceIndex < SEQUENCE.length,
                reason: sequenceIndex >= SEQUENCE.length
                    ? "Puzzle complete"
                    : symbols < 3
                        ? "Collect all symbols first"
                        : null
            },
            { type: ActionType.END_TURN, enabled: true, reason: null }
        ];
    }

    #collectSymbol(action, state) {
        if (action.payload?.itemId !== "symbol") {
            return;
        }

        const symbols = state.get("symbolsCollected") || 0;
        state.set("symbolsCollected", Math.min(3, symbols + 1));
    }

    #activateAltar(action, state) {
        const altarId = action.payload?.altarId;
        const symbols = state.get("symbolsCollected") || 0;

        if (symbols < 3 || !SEQUENCE.includes(altarId)) {
            return;
        }

        const sequenceIndex = state.get("sequenceIndex") || 0;
        if (sequenceIndex >= SEQUENCE.length) {
            return;
        }

        if (altarId === SEQUENCE[sequenceIndex]) {
            state.set("sequenceIndex", sequenceIndex + 1);
            return;
        }

        state.set("mistakes", (state.get("mistakes") || 0) + 1);
        state.set("sequenceIndex", 0);
    }
}
