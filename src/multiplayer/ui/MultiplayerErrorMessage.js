export const MULTIPLAYER_ERROR_TEXT = Object.freeze({
    CONNECTION_ERROR: "Could not connect to the Host server.",
    ROOM_NOT_FOUND: "Room code not found.",
    ROOM_FULL: "That room is already full.",
    ROOM_CLOSED: "The room has been closed.",
    SESSION_START_FAILED: "The game could not be started.",
    SESSION_RESUME_FAILED: "The session could not be restored.",
    HOST_DISCONNECTED: "The Host disconnected.",
    INVALID_ROOM_CODE: "Enter a valid room code.",
    INVALID_REQUEST: "That request could not be completed.",
    TOKEN_EXPIRED: "Reconnect time expired.",
    RESUME_REJECTED: "The session could not be restored.",
    UNKNOWN_ERROR: "Something went wrong."
});

export function getMultiplayerErrorMessage(code) {
    return MULTIPLAYER_ERROR_TEXT[code] || MULTIPLAYER_ERROR_TEXT.UNKNOWN_ERROR;
}
