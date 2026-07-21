import { io } from "socket.io-client";
import { LobbyClient } from "../multiplayer/lobby/LobbyClient.js";
import { SessionControlMessageType } from "../multiplayer/lobby/LobbyMessageType.js";
import { SocketTransportEndpoint } from "../multiplayer/socket/SocketTransportEndpoint.js";
import { createSocketHostGameSession } from "../multiplayer/session/createSocketHostGameSession.js";

export function createMultiplayerHostBrowser({
    url,
    localSessionOptions = {}
} = {}) {
    const socket = io(url, {
        transports: ["websocket"],
        autoConnect: false,
        reconnection: false,
        forceNew: true,
        multiplex: false
    });
    const lobby = new LobbyClient({ url, socket }).connect();
    let transport = null;
    let hostSession = null;
    let guestClientId = null;

    lobby.onMessage(message => {
        if (message?.type === "PEER_CONNECTED") {
            guestClientId = message.payload?.clientId || null;
        }

        if (message?.type === SessionControlMessageType.SESSION_CLOSED) {
            transport?.destroy();
        }

        if (message?.type === SessionControlMessageType.RESUME_SESSION) {
            const senderId = message.payload?.senderId;
            const sessionId = message.payload?.sessionId;
            if (!hostSession || sessionId !== hostSession.sessionId || !hostSession.getPlayerBinding(senderId)) {
                lobby.socket.emit("lobby:request", {
                    type: SessionControlMessageType.RESUME_FAILED,
                    requestId: null,
                    payload: { reasonCode: "SESSION_ID_MISMATCH" }
                });
                return;
            }

            lobby.sendSessionResumed(hostSession.sessionId);
            lobby.sendPlayerBinding(hostSession.getPlayerBinding(senderId));
            hostSession.publishGuestState();
        }
    });

    return {
        lobby,
        async createRoom() {
            return lobby.createRoom();
        },
        async closeRoom() {
            return lobby.closeRoom();
        },
        async activateSession() {
            const lobbyState = lobby.getState();
            if (!guestClientId) {
                throw new Error("Guest must join before session activation");
            }

            const sessionId = `session-${crypto.randomUUID()}`;
            transport = new SocketTransportEndpoint({
                url,
                socket: lobby.socket,
                trustedSenderMode: true
            }).connect();
            hostSession = createSocketHostGameSession({
                transport,
                sessionId,
                hostClientId: lobbyState.clientId,
                guestClientId,
                localSessionOptions
            }).start();
            const activation = await lobby.activateSession(sessionId);
            if (activation.type !== SessionControlMessageType.SESSION_STARTED) {
                throw new Error("Session activation rejected");
            }

            lobby.sendPlayerBinding(hostSession.getGuestBinding());
            hostSession.publishInitialGuestState();
            return { activation, hostSession };
        },
        getHostSession() {
            return hostSession;
        },
        destroy() {
            hostSession?.destroy();
            transport?.destroy();
            lobby.destroy();
            socket.disconnect();
            socket.removeAllListeners();
        }
    };
}
