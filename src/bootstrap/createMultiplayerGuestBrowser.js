import { io } from "socket.io-client";
import { LobbyClient } from "../multiplayer/lobby/LobbyClient.js";
import {
    LobbyMessageType,
    SessionControlMessageType
} from "../multiplayer/lobby/LobbyMessageType.js";
import { SocketTransportEndpoint } from "../multiplayer/socket/SocketTransportEndpoint.js";
import { createSocketGuestGameSession } from "../multiplayer/session/createSocketGuestGameSession.js";
import { createGuestResumeStore } from "../multiplayer/lobby/GuestResumeStore.js";

export function createMultiplayerGuestBrowser({
    url,
    resumeStore = createGuestResumeStore({ serverUrl: url })
} = {}) {
    let socket = null;
    let lobby = null;
    let transport = null;
    let guestSession = null;
    let expectedSessionId = null;
    let binding = null;
    let lastSequence = 0;
    let lastRevision = 0;
    let resumeAttemptId = 0;
    let displayName = "";
    let guestSessionProgressUnsubscribe = null;
    const lobbySubscribers = new Set();

    function createSocket() {
        return io(url, {
            transports: ["polling", "websocket"],
            upgrade: true,
            autoConnect: false,
            reconnection: false,
            forceNew: true,
            multiplex: false
        });
    }

    function cleanupConnection() {
        saveProgress();
        guestSessionProgressUnsubscribe?.();
        guestSessionProgressUnsubscribe = null;
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
        lobby.onMessage((message, state) => {
            handleMessage(message, resumeAttemptId);
            for (const subscriber of [...lobbySubscribers]) {
                subscriber(message, state);
            }
        });
        return lobby;
    }

    function handleMessage(message, attemptId) {
        if (attemptId !== resumeAttemptId) {
            return;
        }

        if (
            message?.type === LobbyMessageType.ROOM_JOINED ||
            message?.type === LobbyMessageType.ROOM_RESUMED
        ) {
            const state = lobby.getState();
            resumeStore.save({
                roomCode: state.roomCode,
                resumeToken: state.resumeToken,
                displayName,
                lastSequence,
                lastRevision
            });
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
                guestSessionProgressUnsubscribe?.();
                guestSessionProgressUnsubscribe = guestSession.subscribe(() => saveProgress());
                saveProgress();
            }
        }

        if (message?.type === SessionControlMessageType.SESSION_CLOSED) {
            resumeStore.clear(lobby.getState().roomCode);
            guestSession?.destroy();
            guestSession = null;
        }
    }

    function saveProgress() {
        if (guestSession) {
            lastSequence = guestSession.getSequence();
            lastRevision = guestSession.getState().revision;
        }
        const state = lobby?.getState?.() || {};
        const credential = resumeStore.read(state.roomCode);
        if (!credential) return;
        resumeStore.save({
            ...credential,
            resumeToken: state.resumeToken || credential.resumeToken,
            displayName: displayName || credential.displayName,
            lastSequence,
            lastRevision
        });
    }

    createLobbyConnection();

    return {
        get lobby() {
            return lobby;
        },
        onLobbyMessage(handler) {
            lobbySubscribers.add(handler);
            return () => lobbySubscribers.delete(handler);
        },
        getStoredResume(roomCode) {
            return resumeStore.read(roomCode);
        },
        clearStoredResume(roomCode) {
            return resumeStore.clear(roomCode);
        },
        joinRoom(input) {
            displayName = input?.displayName || displayName;
            return lobby.joinRoom(input);
        },
        setReady(ready = true) {
            return lobby.setReady(ready);
        },
        async leaveRoom() {
            const roomCode = lobby?.getState?.().roomCode;
            const result = await lobby?.leaveRoom?.();
            resumeStore.clear(roomCode);
            return result;
        },
        async resumeRoom(override = null) {
            const state = lobby?.getState?.() || {};
            const saved = override || resumeStore.read(state.roomCode);
            const roomCode = override?.roomCode || state.roomCode || saved?.roomCode;
            const resumeToken = override?.resumeToken || state.resumeToken || saved?.resumeToken;
            displayName = override?.displayName || saved?.displayName || displayName;
            lastSequence = override?.lastSequence ?? saved?.lastSequence ?? lastSequence;
            lastRevision = override?.lastRevision ?? saved?.lastRevision ?? lastRevision;
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
            const result = await lobby.resumeRoom({ roomCode, resumeToken });
            if (result.type === LobbyMessageType.RESUME_REJECTED) {
                resumeStore.clear(roomCode);
            }
            return result;
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
            lobbySubscribers.clear();
        }
    };
}
