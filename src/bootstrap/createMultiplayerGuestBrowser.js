import { io } from "socket.io-client";
import { LobbyClient } from "../multiplayer/lobby/LobbyClient.js";
import {
    LobbyMessageType,
    SessionControlMessageType
} from "../multiplayer/lobby/LobbyMessageType.js";
import { SocketTransportEndpoint } from "../multiplayer/socket/SocketTransportEndpoint.js";
import { createSocketGuestGameSession } from "../multiplayer/session/createSocketGuestGameSession.js";

export function createMultiplayerGuestBrowser({ url } = {}) {
    let socket = null;
    let lobby = null;
    let transport = null;
    let guestSession = null;
    let expectedSessionId = null;
    let binding = null;
    let lastSequence = 0;
    let lastRevision = 0;
    let resumeAttemptId = 0;

    function createSocket() {
        return io(url, {
            transports: ["websocket"],
            autoConnect: false,
            reconnection: false,
            forceNew: true,
            multiplex: false
        });
    }

    function cleanupConnection() {
        guestSession?.destroy();
        transport?.destroy();
        lobby?.destroy();
        socket?.disconnect();
        socket?.removeAllListeners();
        guestSession = null;
        transport = null;
        lobby = null;
        socket = null;
    }

    function createLobbyConnection() {
        socket = createSocket();
        lobby = new LobbyClient({ url, socket }).connect();
        lobby.onMessage(message => handleMessage(message, resumeAttemptId));
        return lobby;
    }

    function handleMessage(message, attemptId) {
        if (attemptId !== resumeAttemptId) {
            return;
        }

        if (message?.type === SessionControlMessageType.SESSION_STARTED) {
            expectedSessionId = message.payload?.sessionId || null;
            transport = new SocketTransportEndpoint({
                url,
                socket
            }).connect();
        }

        if (message?.type === LobbyMessageType.ROOM_RESUMED) {
            expectedSessionId = message.payload?.sessionId || null;
            transport = new SocketTransportEndpoint({
                url,
                socket
            }).connect();
            lobby.sendResumeSession(expectedSessionId);
        }

        if (message?.type === SessionControlMessageType.SESSION_RESUMED) {
            // Binding and recovery projection still gate ACTIVE session readiness.
        }

        if (message?.type === SessionControlMessageType.PLAYER_BINDING_ASSIGNED) {
            binding = message.payload?.binding || null;
            const result = createSocketGuestGameSession({
                transport,
                binding,
                ownClientId: lobby.getState().clientId,
                expectedSessionId,
                initialSequence: lastSequence,
                initialRevision: lastRevision,
                recoveryBaseline: Boolean(lastRevision)
            });
            if (result.ok) {
                guestSession = result.session;
                lastSequence = guestSession.getSequence();
            }
        }

        if (message?.type === SessionControlMessageType.SESSION_CLOSED) {
            guestSession?.destroy();
            guestSession = null;
        }
    }

    createLobbyConnection();

    return {
        get lobby() {
            return lobby;
        },
        joinRoom(roomCode) {
            return lobby.joinRoom(roomCode);
        },
        async resumeRoom() {
            const state = lobby?.getState?.() || {};
            const roomCode = state.roomCode;
            const resumeToken = state.resumeToken;
            resumeAttemptId++;
            cleanupConnection();
            createLobbyConnection();
            await new Promise((resolve, reject) => {
                const start = Date.now();
                const tick = () => {
                    if (lobby?.getState().clientId) {
                        resolve();
                        return;
                    }
                    if (Date.now() - start > 1000) {
                        reject(new Error("Timed out waiting for reconnect socket"));
                        return;
                    }
                    setTimeout(tick, 10);
                };
                tick();
            });
            return lobby.resumeRoom({ roomCode, resumeToken });
        },
        disconnectForReconnect() {
            if (guestSession) {
                lastSequence = guestSession.getSequence();
                lastRevision = guestSession.getState().revision;
                guestSession.clearPendingForConnectionLost();
                guestSession.destroy();
                guestSession = null;
            }
            transport?.destroy();
            lobby?.destroy();
            socket?.disconnect();
            socket?.removeAllListeners();
        },
        getGuestSession() {
            return guestSession;
        },
        destroy() {
            cleanupConnection();
        }
    };
}
