export const LobbyConnectionState = Object.freeze({
    DISCONNECTED: "DISCONNECTED",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED",
    IN_ROOM: "IN_ROOM",
    READY: "READY",
    ACTIVE: "ACTIVE",
    CLOSED: "CLOSED",
    ERROR: "ERROR"
});

export function createInitialLobbyState() {
    return {
        connectionState: LobbyConnectionState.DISCONNECTED,
        roomCode: null,
        roomId: null,
        clientId: null,
        role: null,
        peerConnected: false,
        sessionId: null,
        error: null
    };
}
