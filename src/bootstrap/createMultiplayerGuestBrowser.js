import { io } from "socket.io-client";
import { LobbyClient } from "../multiplayer/lobby/LobbyClient.js";
import { SessionControlMessageType } from "../multiplayer/lobby/LobbyMessageType.js";
import { SocketTransportEndpoint } from "../multiplayer/socket/SocketTransportEndpoint.js";
import { createSocketGuestGameSession } from "../multiplayer/session/createSocketGuestGameSession.js";

export function createMultiplayerGuestBrowser({ url } = {}) {
    const socket = io(url, {
        transports: ["websocket"],
        autoConnect: false,
        reconnection: false,
        forceNew: true,
        multiplex: false
    });
    const lobby = new LobbyClient({ url, socket }).connect();
    let transport = null;
    let guestSession = null;
    let expectedSessionId = null;

    lobby.onMessage(message => {
        if (message?.type === SessionControlMessageType.SESSION_STARTED) {
            expectedSessionId = message.payload?.sessionId || null;
            transport = new SocketTransportEndpoint({
                url,
                socket: lobby.socket
            }).connect();
        }

        if (message?.type === SessionControlMessageType.PLAYER_BINDING_ASSIGNED) {
            const result = createSocketGuestGameSession({
                transport,
                binding: message.payload?.binding,
                ownClientId: lobby.getState().clientId,
                expectedSessionId
            });
            if (result.ok) {
                guestSession = result.session;
            }
        }

        if (message?.type === SessionControlMessageType.SESSION_CLOSED) {
            guestSession?.destroy();
            guestSession = null;
        }
    });

    return {
        lobby,
        joinRoom(roomCode) {
            return lobby.joinRoom(roomCode);
        },
        getGuestSession() {
            return guestSession;
        },
        destroy() {
            guestSession?.destroy();
            transport?.destroy();
            lobby.destroy();
            socket.disconnect();
            socket.removeAllListeners();
        }
    };
}
