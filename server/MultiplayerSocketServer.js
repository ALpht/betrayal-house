import http from "node:http";
import { Server } from "socket.io";
import { TransportMessageType } from "../src/multiplayer/transport/TransportMessageType.js";
import { TransportSerializer } from "../src/multiplayer/transport/TransportSerializer.js";
import { LobbyRegistry } from "./LobbyRegistry.js";
import { ReconnectReservationManager } from "./ReconnectReservationManager.js";
import {
    LobbyErrorCode,
    LobbyMessageType,
    LobbyRole,
    LobbyRoomStatus,
    SessionControlMessageType
} from "./ServerMessageType.js";

const LOBBY_REQUEST_EVENT = "lobby:request";
const LOBBY_RESPONSE_EVENT = "lobby:response";
const TRANSPORT_EVENT = "transport:message";
const CONNECTION_ERROR_EVENT = "connection:error";

function createClientId() {
    return `client-${crypto.randomUUID()}`;
}

function createSessionId() {
    return `session-${crypto.randomUUID()}`;
}

function response(type, requestId, payload = {}) {
    return { type, requestId: requestId || null, payload };
}

function reject(requestId, code, message = code) {
    return response(LobbyMessageType.ROOM_REJECTED, requestId, {
        code,
        message
    });
}

export class MultiplayerSocketServer {
    constructor({
        port = 3001,
        registry = new LobbyRegistry(),
        clientIdFactory = createClientId,
        sessionIdFactory = createSessionId,
        reconnectGraceMs = 30000,
        scheduler = undefined
    } = {}) {
        this.port = port;
        this.registry = registry;
        this.clientIdFactory = clientIdFactory;
        this.sessionIdFactory = sessionIdFactory;
        this.httpServer = null;
        this.io = null;
        this.clients = new Map();
        this.socketIdsByClientId = new Map();
        this.clientIdsBySocketId = new Map();
        this.reconnectManager = new ReconnectReservationManager({
            registry,
            reconnectGraceMs,
            scheduler,
            onExpired: ({ room }) => this.#handleReconnectExpired(room)
        });
        this.running = false;
        this.stopping = false;
        this.stopPromise = null;
    }

    async start() {
        if (this.running) {
            return this;
        }

        this.httpServer = http.createServer();
        this.io = new Server(this.httpServer, {
            cors: { origin: "*" }
        });
        this.io.on("connection", socket => this.#handleConnection(socket));

        await new Promise(resolve => {
            this.httpServer.listen(this.port, resolve);
        });
        this.running = true;
        return this;
    }

    async stop() {
        if (this.stopPromise) {
            return this.stopPromise;
        }

        this.stopPromise = this.#performStop();
        await this.stopPromise;
        this.stopPromise = null;
    }

    async #performStop() {
        if (!this.running && !this.io && !this.httpServer) {
            return;
        }

        this.stopping = true;
        const io = this.io;
        const httpServer = this.httpServer;

        if (io) {
            for (const socket of io.sockets.sockets.values()) {
                socket.disconnect(true);
            }

            await new Promise((resolve, reject) => {
                io.close(error => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });
        }

        if (httpServer?.listening) {
            await new Promise((resolve, reject) => {
                httpServer.close(error => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });
        }

        this.running = false;
        this.stopping = false;
        this.io = null;
        this.httpServer = null;
        this.clients.clear();
        this.socketIdsByClientId.clear();
        this.clientIdsBySocketId.clear();
        this.reconnectManager.clear();
        this.registry.clear();
    }

    getPort() {
        return this.httpServer?.address()?.port || this.port;
    }

    isRunning() {
        return this.running;
    }

    #handleConnection(socket) {
        if (this.stopping) {
            socket.disconnect(true);
            return;
        }

        const clientId = this.clientIdFactory();
        const connection = {
            socket,
            clientId,
            role: null
        };
        this.#bindConnection(connection);

        socket.emit(LOBBY_RESPONSE_EVENT, response(
            LobbyMessageType.CLIENT_ASSIGNED,
            null,
            { clientId }
        ));

        socket.on(LOBBY_REQUEST_EVENT, message => {
            this.#handleLobbyRequest(connection, message);
        });
        socket.on(TRANSPORT_EVENT, packet => {
            this.#handleTransportMessage(connection, packet);
        });
        socket.on("disconnect", () => {
            this.#handleDisconnect(connection);
        });
    }

    #handleLobbyRequest(connection, message = {}) {
        const requestId = message.requestId || null;
        const type = message.type;
        const payload = message.payload || {};

        if (type === LobbyMessageType.CREATE_ROOM) {
            this.#createRoom(connection, requestId);
            return;
        }

        if (type === LobbyMessageType.JOIN_ROOM) {
            this.#joinRoom(connection, requestId, payload.roomCode);
            return;
        }

        if (type === LobbyMessageType.RESUME_ROOM) {
            this.#resumeRoom(connection, requestId, payload);
            return;
        }

        if (type === SessionControlMessageType.ACTIVATE_SESSION) {
            this.#activateSession(connection, requestId, payload.sessionId);
            return;
        }

        if (type === SessionControlMessageType.PLAYER_BINDING_ASSIGNED) {
            this.#relaySessionControl(connection, message);
            return;
        }

        if (
            type === SessionControlMessageType.RESUME_SESSION ||
            type === SessionControlMessageType.SESSION_RESUMED ||
            type === SessionControlMessageType.RESUME_FAILED
        ) {
            this.#relaySessionControl(connection, message);
            return;
        }

        connection.socket.emit(
            LOBBY_RESPONSE_EVENT,
            reject(requestId, LobbyErrorCode.INVALID_REQUEST)
        );
    }

    #createRoom(connection, requestId) {
        const result = this.registry.createRoom(connection.clientId);
        if (!result.ok) {
            connection.socket.emit(LOBBY_RESPONSE_EVENT, reject(requestId, result.code));
            return;
        }

        connection.role = LobbyRole.HOST;
        connection.socket.emit(LOBBY_RESPONSE_EVENT, response(
            LobbyMessageType.ROOM_CREATED,
            requestId,
            {
                clientId: connection.clientId,
                role: LobbyRole.HOST,
                room: result.room.toJSON()
            }
        ));
    }

    #joinRoom(connection, requestId, roomCode) {
        if (typeof roomCode !== "string" || roomCode.length === 0) {
            connection.socket.emit(
                LOBBY_RESPONSE_EVENT,
                reject(requestId, LobbyErrorCode.INVALID_REQUEST)
            );
            return;
        }

        const result = this.registry.joinRoom({
            roomCode: roomCode.toUpperCase(),
            guestClientId: connection.clientId
        });
        if (!result.ok) {
            connection.socket.emit(LOBBY_RESPONSE_EVENT, reject(requestId, result.code));
            return;
        }

        connection.role = LobbyRole.GUEST;
        const room = result.room;
        const resumeToken = this.reconnectManager.issueToken({
            clientId: connection.clientId,
            roomId: room.roomId,
            role: LobbyRole.GUEST
        });
        connection.socket.emit(LOBBY_RESPONSE_EVENT, response(
            LobbyMessageType.ROOM_JOINED,
            requestId,
            {
                clientId: connection.clientId,
                role: LobbyRole.GUEST,
                room: room.toJSON(),
                resumeToken
            }
        ));
        this.#emitToClient(room.hostClientId, LOBBY_RESPONSE_EVENT, response(
            LobbyMessageType.PEER_CONNECTED,
            null,
            {
                clientId: connection.clientId,
                role: LobbyRole.GUEST,
                room: room.toJSON()
            }
        ));
    }

    #activateSession(connection, requestId, requestedSessionId) {
        const sessionId = typeof requestedSessionId === "string" && requestedSessionId.length > 0
            ? requestedSessionId
            : this.sessionIdFactory();
        const result = this.registry.activateRoom({
            hostClientId: connection.clientId,
            sessionId
        });

        if (!result.ok) {
            connection.socket.emit(LOBBY_RESPONSE_EVENT, reject(requestId, result.code));
            return;
        }

        const room = result.room;
        if (room.guestClientId) {
            this.reconnectManager.updateSession({
                clientId: room.guestClientId,
                sessionId: room.sessionId
            });
        }
        const payload = {
            sessionId: room.sessionId,
            room: room.toJSON()
        };
        connection.socket.emit(LOBBY_RESPONSE_EVENT, response(
            SessionControlMessageType.SESSION_STARTED,
            requestId,
            payload
        ));
        this.#emitToClient(room.guestClientId, LOBBY_RESPONSE_EVENT, response(
            SessionControlMessageType.SESSION_STARTED,
            null,
            payload
        ));
    }

    #relaySessionControl(connection, message) {
        const room = this.registry.findByClientId(connection.clientId);
        if (!room || !this.#isCurrentConnection(connection)) {
            connection.socket.emit(
                LOBBY_RESPONSE_EVENT,
                reject(message.requestId, LobbyErrorCode.STALE_CONNECTION)
            );
            return;
        }

        const role = room.getRole(connection.clientId);
        if (message.type === SessionControlMessageType.RESUME_SESSION) {
            if (role !== LobbyRole.GUEST || room.status !== LobbyRoomStatus.ACTIVE) {
                connection.socket.emit(
                    LOBBY_RESPONSE_EVENT,
                    reject(message.requestId, LobbyErrorCode.INVALID_REQUEST)
                );
                return;
            }

            this.#emitToClient(room.hostClientId, LOBBY_RESPONSE_EVENT, {
                type: SessionControlMessageType.RESUME_SESSION,
                requestId: message.requestId || null,
                payload: {
                    sessionId: message.payload?.sessionId,
                    senderId: connection.clientId
                }
            });
            return;
        }

        if (role !== LobbyRole.HOST) {
            connection.socket.emit(
                LOBBY_RESPONSE_EVENT,
                reject(message.requestId, LobbyErrorCode.NOT_HOST)
            );
            return;
        }

        this.#emitToClient(room.guestClientId, LOBBY_RESPONSE_EVENT, {
            type: message.type,
            requestId: message.requestId || null,
            payload: structuredClone(message.payload || {})
        });
    }

    #resumeRoom(connection, requestId, payload = {}) {
        const result = this.reconnectManager.claimResume({
            roomCode: String(payload.roomCode || "").toUpperCase(),
            resumeToken: payload.resumeToken
        });

        if (!result.accepted) {
            connection.socket.emit(LOBBY_RESPONSE_EVENT, {
                type: LobbyMessageType.RESUME_REJECTED,
                requestId: requestId || null,
                payload: {
                    reasonCode: result.reasonCode
                }
            });
            return;
        }

        this.#unbindConnection(connection.clientId);
        connection.clientId = result.clientId;
        connection.role = LobbyRole.GUEST;
        this.#bindConnection(connection);

        connection.socket.emit(LOBBY_RESPONSE_EVENT, response(
            LobbyMessageType.ROOM_RESUMED,
            requestId,
            {
                roomId: result.roomId,
                roomCode: result.room.roomCode,
                sessionId: result.sessionId,
                clientId: result.clientId,
                role: LobbyRole.GUEST,
                resumeToken: result.rotatedToken,
                room: result.room.toJSON()
            }
        ));
        this.#emitToClient(result.room.hostClientId, LOBBY_RESPONSE_EVENT, response(
            SessionControlMessageType.PEER_RESUMED,
            null,
            {
                roomId: result.roomId,
                clientId: result.clientId,
                sessionId: result.sessionId
            }
        ));
    }

    #handleTransportMessage(connection, packet = {}) {
        const room = this.registry.findByClientId(connection.clientId);
        if (!room || room.status !== LobbyRoomStatus.ACTIVE || !this.#isCurrentConnection(connection)) {
            this.#emitConnectionError(connection, LobbyErrorCode.INVALID_REQUEST);
            return;
        }

        let message;
        try {
            message = TransportSerializer.deserialize(packet.serializedEnvelope);
        } catch (error) {
            this.#emitConnectionError(connection, error.message);
            return;
        }

        if (message.sessionId !== room.sessionId) {
            this.#emitConnectionError(connection, "SESSION_MISMATCH");
            return;
        }

        const role = room.getRole(connection.clientId);
        const direction = this.#resolveDirection(role, message.type);
        if (!direction.allowed) {
            this.#emitConnectionError(connection, "DIRECTION_REJECTED");
            return;
        }

        const targetClientId = direction.to === LobbyRole.HOST
            ? room.hostClientId
            : room.guestClientId;
        this.#emitToClient(targetClientId, TRANSPORT_EVENT, {
            senderId: connection.clientId,
            serializedEnvelope: packet.serializedEnvelope
        });
    }

    #resolveDirection(role, type) {
        if (role === LobbyRole.GUEST && type === TransportMessageType.PLAYER_ACTION) {
            return { allowed: true, to: LobbyRole.HOST };
        }

        if (
            role === LobbyRole.HOST &&
            (
                type === TransportMessageType.ACTION_RESULT ||
                type === TransportMessageType.STATE_UPDATED ||
                type === TransportMessageType.TRANSPORT_ERROR
            )
        ) {
            return { allowed: true, to: LobbyRole.GUEST };
        }

        return { allowed: false, to: null };
    }

    #handleDisconnect(connection) {
        this.#unbindConnection(connection.clientId);
        const result = this.registry.leaveClient(connection.clientId, {
            allowReconnect: connection.role === LobbyRole.GUEST
        });
        if (!result) {
            return;
        }

        const room = result.room;
        if (connection.role === LobbyRole.GUEST && result.reconnecting) {
            const reservation = this.reconnectManager.reserveDisconnectedGuest({
                room,
                clientId: connection.clientId
            });
            this.#emitToClient(room.hostClientId, LOBBY_RESPONSE_EVENT, response(
                SessionControlMessageType.PEER_RECONNECTING,
                null,
                {
                    roomId: room.roomId,
                    clientId: connection.clientId,
                    graceExpiresAt: reservation?.expiresAt || null,
                    room: room.toJSON()
                }
            ));
            return;
        }

        if (connection.role === LobbyRole.GUEST && !result.closed) {
            this.#emitToClient(room.hostClientId, LOBBY_RESPONSE_EVENT, response(
                LobbyMessageType.PEER_DISCONNECTED,
                null,
                {
                    clientId: connection.clientId,
                    reasonCode: result.reasonCode,
                    room: room.toJSON()
                }
            ));
            return;
        }

        if (connection.role === LobbyRole.GUEST && result.closed) {
            this.#emitToClient(room.hostClientId, LOBBY_RESPONSE_EVENT, response(
                SessionControlMessageType.SESSION_CLOSED,
                null,
                {
                    reasonCode: result.reasonCode,
                    room: room.toJSON()
                }
            ));
            return;
        }

        if (connection.role === LobbyRole.HOST && room.guestClientId) {
            this.#emitToClient(room.guestClientId, LOBBY_RESPONSE_EVENT, response(
                SessionControlMessageType.SESSION_CLOSED,
                null,
                {
                    reasonCode: result.reasonCode,
                    room: room.toJSON()
                }
            ));
        }
    }

    #emitConnectionError(connection, code) {
        connection.socket.emit(CONNECTION_ERROR_EVENT, { code });
    }

    #emitToClient(clientId, event, payload) {
        const connection = this.clients.get(clientId);
        connection?.socket.emit(event, payload);
    }

    #bindConnection(connection) {
        this.clients.set(connection.clientId, connection);
        this.socketIdsByClientId.set(connection.clientId, connection.socket.id);
        this.clientIdsBySocketId.set(connection.socket.id, connection.clientId);
    }

    #unbindConnection(clientId) {
        const socketId = this.socketIdsByClientId.get(clientId);
        this.clients.delete(clientId);
        this.socketIdsByClientId.delete(clientId);
        if (socketId) {
            this.clientIdsBySocketId.delete(socketId);
        }
    }

    #isCurrentConnection(connection) {
        return this.socketIdsByClientId.get(connection.clientId) === connection.socket.id;
    }

    #handleReconnectExpired(room) {
        room.close("RECONNECT_TIMEOUT");
        this.reconnectManager.clear();
        this.registry.closeRoom(room.roomId, "RECONNECT_TIMEOUT");
        this.#emitToClient(room.hostClientId, LOBBY_RESPONSE_EVENT, response(
            SessionControlMessageType.SESSION_CLOSED,
            null,
            {
                reasonCode: "RECONNECT_TIMEOUT",
                room: room.toJSON()
            }
        ));
    }
}
