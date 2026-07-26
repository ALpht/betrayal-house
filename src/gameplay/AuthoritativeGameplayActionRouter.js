import { GAME_STATE } from "../state/GameStateManager.js";

function rejected(reasonCode = "ACTION_REJECTED") {
    return {
        accepted: false,
        reasonCode,
        stateChanged: false,
        shouldPublish: false
    };
}

export class AuthoritativeGameplayActionRouter {
    constructor({
        getGameState,
        getRuntime,
        getCurrentPlayerId,
        explorationActionHandler,
        executeScenarioAction
    }) {
        this.getGameState = getGameState;
        this.getRuntime = getRuntime;
        this.getCurrentPlayerId = getCurrentPlayerId;
        this.explorationActionHandler = explorationActionHandler;
        this.executeScenarioAction = executeScenarioAction;
    }

    execute(action) {
        const phase = this.getGameState();
        const runtime = this.getRuntime();
        if (
            !action?.playerId ||
            action.playerId !== this.getCurrentPlayerId()
        ) {
            return rejected("NOT_CURRENT_PLAYER");
        }

        if (phase === GAME_STATE.EXPLORATION) {
            if (runtime) {
                return rejected("INVALID_GAME_PHASE");
            }
            return this.explorationActionHandler.dispatch(action);
        }

        if (phase === GAME_STATE.HAUNT) {
            if (!runtime) {
                return rejected("SCENARIO_RUNTIME_MISSING");
            }

            const result = this.executeScenarioAction(action);
            return result?.success
                ? {
                    accepted: true,
                    reasonCode: null,
                    stateChanged: true,
                    shouldPublish: result.shouldPublish ?? true
                }
                : rejected("ACTION_REJECTED");
        }

        return rejected("INVALID_GAME_PHASE");
    }

    getAvailability(playerId) {
        const phase = this.getGameState();
        const runtime = this.getRuntime();

        if (phase === GAME_STATE.EXPLORATION && !runtime) {
            return this.explorationActionHandler.getAvailability(playerId);
        }

        if (phase === GAME_STATE.HAUNT && runtime) {
            return runtime.getActionAvailability();
        }

        return [];
    }
}
