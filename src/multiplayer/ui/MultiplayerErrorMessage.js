export const MULTIPLAYER_ERROR_TEXT = Object.freeze({
    CONNECTION_ERROR: "Could not connect to the Host server.",
    ROOM_NOT_FOUND: "Room code not found.",
    ROOM_FULL: "That room is already full.",
    ROOM_CLOSED: "The room has been closed.",
    ROOM_ACTIVE: "That room has already started.",
    INVALID_DISPLAY_NAME: "Enter a display name.",
    ROSTER_INCOMPLETE: "Waiting for all players to join.",
    PLAYER_NOT_READY: "Waiting for all players to mark ready.",
    PLAYER_DISCONNECTED: "A player is disconnected.",
    PLAYER_LEFT_ACTIVE_SESSION: "A player left the active session.",
    BINDING_CREATION_FAILED: "Player assignment failed.",
    SESSION_CLOSED: "The multiplayer session has ended.",
    SESSION_START_FAILED: "The game could not be started.",
    SESSION_RESUME_FAILED: "The session could not be restored.",
    HOST_DISCONNECTED: "The Host disconnected.",
    REQUEST_TIMEOUT: "The Host did not respond. Check the LAN address, Wi-Fi, and firewall.",
    INVALID_ROOM_CODE: "Enter a valid room code.",
    INVALID_REQUEST: "That request could not be completed.",
    TOKEN_EXPIRED: "Reconnect time expired.",
    RESUME_REJECTED: "The session could not be restored.",
    UNKNOWN_ERROR: "Something went wrong."
});

export function getMultiplayerErrorMessage(code) {
    return MULTIPLAYER_ERROR_TEXT[code] || MULTIPLAYER_ERROR_TEXT.UNKNOWN_ERROR;
}
