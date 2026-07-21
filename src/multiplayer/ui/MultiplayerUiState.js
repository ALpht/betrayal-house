export const MultiplayerMode = Object.freeze({
    ENTRY: "ENTRY",
    LOCAL: "LOCAL",
    HOST: "HOST",
    GUEST: "GUEST"
});

export const MultiplayerConnectionState = Object.freeze({
    DISCONNECTED: "DISCONNECTED",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED",
    RECONNECTING: "RECONNECTING",
    FAILED: "FAILED"
});

export const MultiplayerLobbyState = Object.freeze({
    IDLE: "IDLE",
    CREATING: "CREATING",
    WAITING_FOR_GUEST: "WAITING_FOR_GUEST",
    JOINING: "JOINING",
    JOINED: "JOINED",
    REJECTED: "REJECTED",
    CLOSED: "CLOSED"
});

export const MultiplayerSessionState = Object.freeze({
    INACTIVE: "INACTIVE",
    WAITING_TO_START: "WAITING_TO_START",
    STARTING: "STARTING",
    RESUMING: "RESUMING",
    ACTIVE: "ACTIVE",
    GAME_ENDED: "GAME_ENDED",
    CLOSED: "CLOSED"
});
