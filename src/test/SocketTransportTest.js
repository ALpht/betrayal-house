import { io as createSocketClient } from "socket.io-client";
import { MultiplayerSocketServer } from "../../server/MultiplayerSocketServer.js";
import {
    LobbyMessageType,
    SessionControlMessageType
} from "../multiplayer/lobby/LobbyMessageType.js";
import { TransportMessageType } from "../multiplayer/transport/TransportMessageType.js";
import { SocketTransportEndpoint } from "../multiplayer/socket/SocketTransportEndpoint.js";

function once(socket, event) {
    return new Promise(resolve => socket.once(event, resolve));
}

function connectClient(url) {
    const socket = createSocketClient(url, {
        transports: ["websocket"],
        autoConnect: false,
        reconnection: false,
        forceNew: true,
        multiplex: false
    });
    return new Promise(resolve => {
        let assigned = null;
        let connected = false;
        function maybeResolve() {
            if (connected && assigned) {
                resolve({ socket, assigned });
            }
        }
        socket.once("connect", () => {
            connected = true;
            maybeResolve();
        });
        socket.once("lobby:response", message => {
            assigned = message;
            maybeResolve();
        });
        socket.connect();
    });
}

function lobbyRequest(socket, type, payload = {}, requestId = crypto.randomUUID()) {
    const response = once(socket, "lobby:response");
    socket.emit("lobby:request", { type, requestId, payload });
    return response;
}

function createPlayerAction({ sessionId, senderId = "forged", sequence = 1, playerId = "p2" }) {
    return {
        type: TransportMessageType.PLAYER_ACTION,
        sessionId,
        senderId,
        sequence,
        payload: {
            id: `action-${sequence}`,
            type: "COLLECT",
            playerId,
            payload: { targetId: "relic_1" }
        }
    };
}

export async function runSocketTransportTest() {
    console.log("\n===== Socket Transport Test =====");
    let passed = 0;
    let failed = 0;

    const assert = (ok, label) => {
        if (ok) {
            passed++;
            console.log(`[PASS] ${label}`);
        } else {
            failed++;
            console.log(`[FAIL] ${label}`);
        }
    };

    let server;
    let hostSocket;
    let guestSocket;

    try {
        server = await new MultiplayerSocketServer({ port: 0 }).start();
        const url = `http://localhost:${server.getPort()}`;
        const hostConnection = await connectClient(url);
        const guestConnection = await connectClient(url);
        hostSocket = hostConnection.socket;
        guestSocket = guestConnection.socket;
        const hostAssigned = hostConnection.assigned;
        const guestAssigned = guestConnection.assigned;
        const hostClientId = hostAssigned.payload.clientId;
        const guestClientId = guestAssigned.payload.clientId;

        const created = await lobbyRequest(hostSocket, LobbyMessageType.CREATE_ROOM);
        const joinedPromise = lobbyRequest(guestSocket, LobbyMessageType.JOIN_ROOM, {
            roomCode: created.payload.room.roomCode
        });
        await once(hostSocket, "lobby:response");
        await joinedPromise;
        const started = await lobbyRequest(hostSocket, SessionControlMessageType.ACTIVATE_SESSION, {
            sessionId: "session-socket-test"
        });
        const guestStarted = await once(guestSocket, "lobby:response");
        const sessionId = started.payload.sessionId;

        const hostEndpoint = new SocketTransportEndpoint({
            socket: hostSocket,
            trustedSenderMode: true
        }).connect();
        const guestEndpoint = new SocketTransportEndpoint({
            socket: guestSocket
        }).connect();

        let hostMessage = null;
        hostEndpoint.subscribe(message => { hostMessage = message; });
        const sent = guestEndpoint.send(createPlayerAction({
            sessionId,
            senderId: "forged-client",
            playerId: "p2"
        }));
        await new Promise(resolve => setTimeout(resolve, 20));

        assert(
            hostClientId !== guestClientId &&
                created.payload.room.roomId !== created.payload.room.roomCode &&
                created.payload.room.roomId !== sessionId &&
                guestStarted.type === SessionControlMessageType.SESSION_STARTED,
            "Case 1: Server assigns identity and keeps room/session identities distinct"
        );
        assert(
            sent === true &&
                hostMessage?.senderId === guestClientId &&
                hostMessage.payload.playerId === "p2",
            "Case 2: PLAYER_ACTION relays with trusted sender metadata without rewriting payload"
        );

        let guestResult = null;
        guestEndpoint.subscribe(message => { guestResult = message; });
        hostEndpoint.send({
            type: TransportMessageType.ACTION_RESULT,
            sessionId,
            payload: {
                sequence: 1,
                accepted: true,
                reasonCode: null
            }
        });
        await new Promise(resolve => setTimeout(resolve, 20));

        assert(
            guestResult?.type === TransportMessageType.ACTION_RESULT &&
                guestResult.payload.sequence === 1,
            "Case 3: Host ACTION_RESULT relays to guest once"
        );

        let directionRejected = false;
        guestSocket.once("connection:error", () => { directionRejected = true; });
        guestEndpoint.send({
            type: TransportMessageType.STATE_UPDATED,
            sessionId,
            revision: 1,
            payload: { projection: {} }
        });
        await new Promise(resolve => setTimeout(resolve, 20));

        assert(
            directionRejected,
            "Case 4: Guest cannot send authoritative STATE_UPDATED"
        );

        hostEndpoint.destroy();
        guestEndpoint.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Socket transport cases threw", e.message);
    } finally {
        hostSocket?.disconnect();
        guestSocket?.disconnect();
        await server?.stop();
        await server?.stop();
    }

    console.log(`===== Socket Transport Test: ${passed} passed, ${failed} failed =====\n`);
}
