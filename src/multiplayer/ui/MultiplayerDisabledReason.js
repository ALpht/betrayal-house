export const MultiplayerDisabledReason = Object.freeze({
    ROOM_CLOSED: "ROOM_CLOSED",
    GAME_ENDED: "GAME_ENDED",
    CONNECTION_LOST: "CONNECTION_LOST",
    SESSION_RESUMING: "SESSION_RESUMING",
    WAITING_FOR_SESSION: "WAITING_FOR_SESSION",
    WAITING_FOR_BINDING: "WAITING_FOR_BINDING",
    NOT_YOUR_TURN: "NOT_YOUR_TURN",
    TARGET_REQUIRED: "TARGET_REQUIRED",
    ACTION_UNAVAILABLE: "ACTION_UNAVAILABLE"
});

export const DISABLED_REASON_TEXT = Object.freeze({
    ROOM_CLOSED: "The room has been closed.",
    GAME_ENDED: "The game has ended.",
    CONNECTION_LOST: "Connection lost. Actions are temporarily unavailable.",
    SESSION_RESUMING: "Restoring the latest game state.",
    WAITING_FOR_SESSION: "Waiting for the Host to start the game.",
    WAITING_FOR_BINDING: "Your player assignment is still loading.",
    NOT_YOUR_TURN: "It is the other player's turn.",
    TARGET_REQUIRED: "Select a valid target first.",
    ACTION_UNAVAILABLE: "This action is not available right now."
});

export function getDisabledReasonText(reason) {
    return DISABLED_REASON_TEXT[reason] || "";
}

export function deriveDisabledReason({
    roomClosed = false,
    gameEnded = false,
    connectionLost = false,
    sessionResuming = false,
    waitingForSession = false,
    waitingForBinding = false,
    localTargetRequired = false,
    projection = null
} = {}) {
    if (roomClosed) return MultiplayerDisabledReason.ROOM_CLOSED;
    if (gameEnded || projection?.gameEnded || projection?.victory?.completed) {
        return MultiplayerDisabledReason.GAME_ENDED;
    }
    if (connectionLost) return MultiplayerDisabledReason.CONNECTION_LOST;
    if (sessionResuming) return MultiplayerDisabledReason.SESSION_RESUMING;
    if (waitingForSession) return MultiplayerDisabledReason.WAITING_FOR_SESSION;
    if (waitingForBinding) return MultiplayerDisabledReason.WAITING_FOR_BINDING;
    if (projection?.turn && projection.turn.isViewerTurn === false) {
        return MultiplayerDisabledReason.NOT_YOUR_TURN;
    }
    if (localTargetRequired) return MultiplayerDisabledReason.TARGET_REQUIRED;

    const actions = Array.isArray(projection?.actions) ? projection.actions : [];
    if (actions.length > 0 && actions.every(action => !action.enabled)) {
        return MultiplayerDisabledReason.ACTION_UNAVAILABLE;
    }

    return null;
}
