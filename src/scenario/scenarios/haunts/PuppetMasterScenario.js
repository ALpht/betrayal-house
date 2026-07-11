import { HauntScenario } from "../../HauntScenario.js";
import { InformationPacket } from "../../information/InformationPacket.js";
import { InformationAudience } from "../../information/InformationAudience.js";
import { InformationScope } from "../../information/InformationScope.js";
import { ActionType } from "../../action/ActionType.js";

export class PuppetMasterScenario extends HauntScenario {
    static meta = {
        id: "puppetMaster",
        title: "The Puppet Master",
        description: "Destroy 3 possessed dolls to banish the Puppet Master.",
        difficulty: 2,
        traitorRule: "random",
        objectives: {
            heroes: "Destroy 3 possessed dolls.",
            traitor: "Protect the dolls. Kill all heroes."
        }
    };

    start(context, state) {
        super.start(context, state);
        const playerCount = context.players?.getAllPlayers()?.length || 4;
        state.set("dollsDestroyed", 0);
        state.set("heroesAlive", playerCount);
        state.set("gameOver", false);

        const router = context.services?.get("router");
        if (!router) return;

        router.route(new InformationPacket({
            id: "puppetMaster_hero_objective",
            audience: InformationAudience.HEROES_ONLY,
            scope: InformationScope.OBJECTIVE,
            payload: {
                text: "Destroy 3 possessed dolls to banish the Puppet Master.",
                target: 3,
                progress: 0
            }
        }));

        router.route(new InformationPacket({
            id: "puppetMaster_traitor_objective",
            audience: InformationAudience.TRAITOR_ONLY,
            scope: InformationScope.OBJECTIVE,
            payload: {
                text: "Protect the dolls. Eliminate all heroes before they destroy 3 dolls."
            }
        }));
    }

    onAction(action, context, state) {
        if (action.type !== ActionType.DESTROY) {
            return;
        }

        state.increment("dollsDestroyed", 1);
    }

    getSupportedActions() {
        return [ActionType.DESTROY, ActionType.END_TURN];
    }

    getActionAvailability(context, state) {
        const dollsDestroyed = state.get("dollsDestroyed") || 0;
        const gameOver = state.get("gameOver") || false;

        return [
            { type: ActionType.DESTROY, enabled: !gameOver && dollsDestroyed < 3, reason: gameOver ? "Game over" : dollsDestroyed >= 3 ? "All dolls destroyed" : null },
            { type: ActionType.END_TURN, enabled: true, reason: null }
        ];
    }
}