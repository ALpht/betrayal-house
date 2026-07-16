import { HauntScenario } from "../../../HauntScenario.js";
import { InformationPacket } from "../../../information/InformationPacket.js";
import { InformationAudience } from "../../../information/InformationAudience.js";
import { InformationScope } from "../../../information/InformationScope.js";
import { ActionType } from "../../../action/ActionType.js";

const RELIC_IDS = ["relic_1", "relic_2", "relic_3"];

export class RelicEscapeScenario extends HauntScenario {
    #state = null;

    static meta = {
        id: "relicEscape",
        title: "Relic Escape",
        description: "Collect three relics and reach the exit before the house seals itself.",
        difficulty: 2,
        traitorRule: "random",
        objectives: {
            heroes: "Collect all three relics, then move to the exit.",
            traitor: "Delay the heroes until the exit is sealed."
        }
    };

    start(context, state) {
        super.start(context, state);
        this.#state = state;
        state.set("collectedRelicIds", []);
        state.set("exitReached", false);
        state.set("turnsElapsed", 0);

        const router = context.services?.get("router");
        if (!router) return;

        router.route(new InformationPacket({
            id: "relicEscape_hero_objective",
            audience: InformationAudience.HEROES_ONLY,
            scope: InformationScope.OBJECTIVE,
            payload: {
                text: "Collect three relics, then escape through the exit.",
                relicsNeeded: 3
            }
        }));

        router.route(new InformationPacket({
            id: "relicEscape_traitor_objective",
            audience: InformationAudience.TRAITOR_ONLY,
            scope: InformationScope.OBJECTIVE,
            payload: {
                text: "Delay the heroes until the exit seals after 8 turns.",
                turnLimit: 8
            }
        }));
    }

    onTurnEnd() {
        const turns = this.#state?.get("turnsElapsed") || 0;
        this.#state?.set("turnsElapsed", turns + 1);
    }

    onAction(action, context, state) {
        if (action.type === ActionType.COLLECT) {
            this.#collectRelic(action, state);
        }

        if (action.type === ActionType.MOVE) {
            this.#moveToExit(action, state);
        }
    }

    getSupportedActions() {
        return [ActionType.COLLECT, ActionType.MOVE, ActionType.END_TURN];
    }

    getActionAvailability(context, state) {
        const collected = state.get("collectedRelicIds") || [];
        const exitReached = state.get("exitReached") === true;

        return [
            {
                type: ActionType.COLLECT,
                enabled: collected.length < RELIC_IDS.length,
                reason: collected.length >= RELIC_IDS.length ? "All relics collected" : null
            },
            {
                type: ActionType.MOVE,
                enabled: collected.length >= RELIC_IDS.length && !exitReached,
                reason: exitReached
                    ? "Exit reached"
                    : collected.length < RELIC_IDS.length
                        ? "Collect all relics first"
                        : null
            },
            { type: ActionType.END_TURN, enabled: true, reason: null }
        ];
    }

    #collectRelic(action, state) {
        if (
            action.payload?.itemId !== "relic"
            || !RELIC_IDS.includes(action.payload?.targetId)
        ) {
            return;
        }

        const collected = state.get("collectedRelicIds") || [];
        if (collected.includes(action.payload.targetId)) {
            return;
        }

        state.set(
            "collectedRelicIds",
            [...collected, action.payload.targetId]
        );
    }

    #moveToExit(action, state) {
        const collected = state.get("collectedRelicIds") || [];
        if (
            action.payload?.destination !== "exit"
            || collected.length < RELIC_IDS.length
        ) {
            return;
        }

        state.set("exitReached", true);
    }
}
