import http from "node:http";
import { Server } from "socket.io";
import { TransportMessageType } from "../src/multiplayer/transport/TransportMessageType.js";
import { TransportSerializer } from "../src/multiplayer/transport/TransportSerializer.js";
import { LobbyRegistry } from "./LobbyRegistry.js";
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
        sessionIdFactory = createSessionId
    } = {}) {
        this.port = port;
        this.registry = registry;
        this.clientIdFactory = clientIdFactory;
        this.sessionIdFactory = sessionIdFactory;
        this.httpServer = null;
        this.io = null;
        this.clients = new Map();
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
        this.clients.set(clientId, connection);

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

        if (type === SessionControlMessageType.ACTIVATE_SESSION) {
            this.#activateSession(connection, requestId, payload.sessionId);
            return;
        }

        if (type === SessionControlMessageType.PLAYER_BINDING_ASSIGNED) {
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
        connection.socket.emit(LOBBY_RESPONSE_EVENT, response(
            LobbyMessageType.ROOM_JOINED,
            requestId,
            {
                clientId: connection.clientId,
                role: LobbyRole.GUEST,
                room: room.toJSON()
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
        if (!room || room.hostClientId !== connection.clientId) {
            connection.socket.emit(
                LOBBY_RESPONSE_EVENT,
                reject(message.requestId, LobbyErrorCode.NOT_HOST)
            );
            return;
        }

        this.#emitToClient(room.guestClientId, LOBBY_RESPONSE_EVENT, {
            type: SessionControlMessageType.PLAYER_BINDING_ASSIGNED,
            requestId: message.requestId || null,
            payload: structuredClone(message.payload || {})
        });
    }

    #handleTransportMessage(connection, packet = {}) {
        const room = this.registry.findByClientId(connection.clientId);
        if (!room || room.status !== LobbyRoomStatus.ACTIVE) {
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
        this.clients.delete(connection.clientId);
        const result = this.registry.leaveClient(connection.clientId);
        if (!result) {
            return;
        }

        const room = result.room;
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
}
