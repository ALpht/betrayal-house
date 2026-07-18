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
        role: null,
        peerConnected: false,
        sessionId: null,
        resumeToken: null,
        error: null
    };
}
