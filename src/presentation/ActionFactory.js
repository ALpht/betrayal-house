import { PlayerAction } from "../scenario/action/PlayerAction.js";
import { ActionType } from "../scenario/action/ActionType.js";

let _nextId = 0;

function nextId() {
    return `ui_${++_nextId}`;
}

export const ActionFactory = {
    createMove(playerId, destination) {
        return new PlayerAction({
            id: nextId(),
            type: ActionType.MOVE,
            playerId,
            payload: { destination }
        });
    },

    createAttack(playerId, target) {
        return new PlayerAction({
            id: nextId(),
            type: ActionType.ATTACK,
            playerId,
            payload: { target }
        });
    },

    createCollect(playerId, itemId) {
        return new PlayerAction({
            id: nextId(),
            type: ActionType.COLLECT,
            playerId,
            payload: { itemId }
        });
    },

    createActivate(playerId, altar) {
        return new PlayerAction({
            id: nextId(),
            type: ActionType.ACTIVATE,
            playerId,
            payload: { altar }
        });
    },

    createInteract(playerId, type) {
        return new PlayerAction({
            id: nextId(),
            type: ActionType.INTERACT,
            playerId,
            payload: { type }
        });
    },

    createDestroy(playerId, target) {
        return new PlayerAction({
            id: nextId(),
            type: ActionType.DESTROY,
            playerId,
            payload: { target }
        });
    },

    createEndTurn(playerId) {
        return new PlayerAction({
            id: nextId(),
            type: ActionType.END_TURN,
            playerId,
            payload: {}
        });
    }
};
