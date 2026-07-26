import { ActionType } from "../../scenario/action/ActionType.js";
import { ActionValidator } from "../../scenario/action/ActionValidator.js";
import {
    EXPLORATION_DIRECTIONS,
    EXPLORATION_DIRECTION_DATA
} from "./ExplorationDirections.js";

function rejected(reasonCode = "ACTION_REJECTED") {
    return {
        accepted: false,
        reasonCode,
        stateChanged: false,
        shouldPublish: false
    };
}

export class ExplorationActionHandler {
    constructor({
        playerManager,
        turnManager,
        explorationRule
    }) {
        this.playerManager = playerManager;
        this.turnManager = turnManager;
        this.explorationRule = explorationRule;
    }

    dispatch(action) {
        const validation = ActionValidator.validate(action);
        if (!validation.valid) {
            return rejected("ACTION_REJECTED");
        }

        const player = this.playerManager.getPlayer(action.playerId);
        if (!player || !this.turnManager.isCurrentPlayer(player)) {
            return rejected("NOT_CURRENT_PLAYER");
        }

        if (action.type === ActionType.END_TURN) {
            this.turnManager.nextTurn();
            return {
                accepted: true,
                reasonCode: null,
                stateChanged: true,
                shouldPublish: true
            };
        }

        if (
            action.type !== ActionType.MOVE ||
            !EXPLORATION_DIRECTIONS.includes(action.payload?.direction)
        ) {
            return rejected("ACTION_REJECTED");
        }

        return this.explorationRule.executeMove(
            player,
            action.payload.direction
        );
    }

    getDirectionAvailability(playerId) {
        const player = this.playerManager.getPlayer(playerId);
        const isCurrentPlayer =
            Boolean(player) &&
            this.turnManager.isCurrentPlayer(player);

        return EXPLORATION_DIRECTIONS.map(direction => {
            const availability = player
                ? this.explorationRule.getDirectionAvailability(player, direction)
                : {
                    enabled: false,
                    reasonCode: "PLAYER_NOT_FOUND"
                };

            return {
                type: ActionType.MOVE,
                label: EXPLORATION_DIRECTION_DATA[direction].label,
                enabled: isCurrentPlayer && availability.enabled,
                reason: isCurrentPlayer
                    ? availability.reasonCode
                    : "NOT_CURRENT_PLAYER",
                payload: { direction }
            };
        });
    }

    getAvailability(playerId) {
        const isCurrentPlayer =
            this.turnManager.getCurrentPlayer()?.id === playerId;
        return [
            ...this.getDirectionAvailability(playerId),
            {
                type: ActionType.END_TURN,
                label: "End Turn",
                enabled: isCurrentPlayer,
                reason: isCurrentPlayer ? null : "NOT_CURRENT_PLAYER"
            }
        ];
    }
}
