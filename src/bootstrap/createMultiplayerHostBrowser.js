import { io } from "socket.io-client";
import { LobbyClient } from "../multiplayer/lobby/LobbyClient.js";
import { SessionControlMessageType } from "../multiplayer/lobby/LobbyMessageType.js";
import { SocketTransportEndpoint } from "../multiplayer/socket/SocketTransportEndpoint.js";
import { createSocketHostGameSession } from "../multiplayer/session/createSocketHostGameSession.js";
import { createRuntimeId } from "../core/RuntimeId.js";

export function createMultiplayerHostBrowser({
    url,
    localSessionOptions = {},
    initialScenarioId = "relicEscape"
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
    let guestRoster = [];
    const connectionIdsByGuestId = new Map();

    lobby.onMessage(message => {
        if (message?.type === "PEER_CONNECTED") {
            const guestId = message.payload?.guestId;
            const connectionId = message.payload?.clientId;
            if (guestId && connectionId) {
                connectionIdsByGuestId.set(guestId, connectionId);
            }
        }

        if (
            message?.type === "PEER_CONNECTED" ||
            message?.type === "ROOM_ROSTER_UPDATED"
        ) {
            const roster = message.payload?.room?.roster || guestRoster;
            guestRoster = roster.map(member => ({
                ...member,
                currentConnectionId: connectionIdsByGuestId.get(member.guestId) ||
                    member.currentConnectionId ||
                    null
            }));
        }

        if (message?.type === SessionControlMessageType.PEER_RESUMED) {
            const guestId = message.payload?.guestId;
            const oldConnectionId = message.payload?.previousConnectionId;
            const newConnectionId = message.payload?.clientId;
            hostSession?.restoreGuestConnection?.({
                guestId,
                oldConnectionId,
                newConnectionId
            });
            if (guestId && newConnectionId) {
                connectionIdsByGuestId.set(guestId, newConnectionId);
            }
            guestRoster = guestRoster.map(member =>
                member.guestId === guestId
                    ? { ...member, currentConnectionId: newConnectionId }
                    : member
            );
        }

        if (message?.type === SessionControlMessageType.SESSION_CLOSED) {
            transport?.destroy();
            hostSession?.destroy();
            hostSession = null;
            transport = null;
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
            const binding = hostSession.getPlayerBinding(senderId);
            lobby.sendPlayerBinding(binding, { targetClientId: senderId });
            hostSession.publishGuestState(senderId);
        }
    });

    return {
        lobby,
        async createRoom(options = {}) {
            return lobby.createRoom(options);
        },
        async closeRoom() {
            return lobby.closeRoom();
        },
        async activateSession() {
            const lobbyState = lobby.getState();
            const roster = guestRoster.length ? guestRoster : lobbyState.roster || [];
            if (!Array.isArray(roster) || roster.length < 1) {
                throw new Error("Guest roster must be complete before session activation");
            }

            const sessionId = createRuntimeId("session");
            transport = new SocketTransportEndpoint({
                url,
                socket: lobby.socket,
                trustedSenderMode: true
            }).connect();
            hostSession = createSocketHostGameSession({
                transport,
                sessionId,
                hostClientId: lobbyState.clientId,
                guestRoster: roster.map(member => ({
                    guestId: member.guestId,
                    currentConnectionId: member.currentConnectionId,
                    displayName: member.displayName,
                    joinOrder: member.joinOrder
                })),
                localSessionOptions
            }).start();
            const publicAssignments = hostSession.getPublicAssignments();
            for (const assignment of publicAssignments) {
                const member = roster.find(candidate => candidate.guestId === assignment.guestId);
                if (member) {
                    member.playerId = assignment.playerId;
                    member.publicPlayerName = assignment.publicPlayerName;
                    member.publicCharacterName = assignment.publicCharacterName;
                }
            }
            const activation = await lobby.activateSession(sessionId, publicAssignments);
            if (activation.type !== SessionControlMessageType.SESSION_STARTED) {
                hostSession.destroy();
                hostSession = null;
                throw new Error("Session activation rejected");
            }

            for (const member of roster) {
                const binding = hostSession.getPlayerBinding(member.currentConnectionId);
                lobby.sendPlayerBinding(binding, { targetClientId: member.currentConnectionId });
            }
            if (initialScenarioId) {
                hostSession.localSession.startScenario(initialScenarioId);
            }
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
