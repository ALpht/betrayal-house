import { ActionType } from "../../scenario/action/ActionType.js";

const MAP_DIRECTIONS = Object.freeze([
    "north",
    "east",
    "south",
    "west"
]);

export function executeAuthoritativePlayerAction(localSession, action) {
    const currentPlayerId = localSession.getCurrentPlayer?.()?.id || null;
    if (!currentPlayerId || currentPlayerId !== action?.playerId) {
        return { accepted: false, reasonCode: "ACTION_REJECTED" };
    }

    const direction = action?.payload?.direction;
    if (action?.type === ActionType.MOVE && MAP_DIRECTIONS.includes(direction)) {
        return localSession.move(direction)
            ? { accepted: true, reasonCode: null }
            : { accepted: false, reasonCode: "ACTION_REJECTED" };
    }

    const result = localSession.dispatchScenarioAction(action);
    return result?.success
        ? { accepted: true, reasonCode: null }
        : { accepted: false, reasonCode: "ACTION_REJECTED" };
}
