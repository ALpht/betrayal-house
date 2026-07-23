export const LobbyConnectionState = Object.freeze({
    DISCONNECTED: "DISCONNECTED",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED",
    IN_ROOM: "IN_ROOM",
    READY: "READY",
    ACTIVE: "ACTIVE",
    RECONNECTING: "RECONNECTING",
    RESUMING: "RESUMING",
    CLOSED: "CLOSED",
    ERROR: "ERROR"
});

export function createInitialLobbyState() {
    return {
        connectionState: LobbyConnectionState.DISCONNECTED,
        roomCode: null,
        roomId: null,
        clientId: null,
        lanAddress: null,
        socketServerPort: null,
        role: null,
        peerConnected: false,
        playerCount: 2,
        capacity: 2,
        roster: [],
        canStart: false,
        startDisabledReason: null,
        sessionId: null,
        resumeToken: null,
        error: null
    };
}
