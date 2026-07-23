import { io } from "socket.io-client";
import {
    LobbyMessageType,
    SessionControlMessageType
} from "./LobbyMessageType.js";
import {
    createInitialLobbyState,
    LobbyConnectionState
} from "./LobbyState.js";
import { createRuntimeId } from "../../core/RuntimeId.js";

const LOBBY_REQUEST_EVENT = "lobby:request";
const LOBBY_RESPONSE_EVENT = "lobby:response";
const CONNECTION_ERROR_EVENT = "connection:error";

function createRequestId() {
    return createRuntimeId("request");
}

export class LobbyClient {
    constructor({
        url,
        socket = null,
        requestIdFactory = createRequestId,
        requestTimeoutMs = 5000
    } = {}) {
        this.url = url;
        this.socket = socket;
        this.requestIdFactory = requestIdFactory;
        this.requestTimeoutMs = requestTimeoutMs;
        this.state = createInitialLobbyState();
        this.subscribers = new Set();
        this.pending = new Map();
        this.destroyed = false;
        this.boundResponseHandler = message => this.#handleMessage(message);
        this.boundErrorHandler = error => this.#setError(error?.code || "CONNECTION_ERROR");
        this.boundConnectHandler = () => {
            if (this.destroyed) return;
            this.state.connectionState = LobbyConnectionState.CONNECTED;
            this.#notify();
        };
        this.boundDisconnectHandler = () => {
            if (this.destroyed) return;
            this.state.connectionState = LobbyConnectionState.DISCONNECTED;
            this.#notify();
        };
    }

    connect() {
        if (this.destroyed) {
            return this;
        }

        this.state.connectionState = LobbyConnectionState.CONNECTING;
        this.#notify();

        if (!this.socket) {
            this.socket = io(this.url, {
                transports: ["websocket"],
                autoConnect: false,
                reconnection: false,
                forceNew: true,
                multiplex: false
            });
        }

        this.socket.on(LOBBY_RESPONSE_EVENT, this.boundResponseHandler);
        this.socket.on(CONNECTION_ERROR_EVENT, this.boundErrorHandler);
        this.socket.on("connect", this.boundConnectHandler);
        this.socket.on("disconnect", this.boundDisconnectHandler);

        if (!this.socket.connected) {
            this.socket.connect();
        }

        return this;
    }

    createRoom(options = {}) {
        return this.#sendRequest(LobbyMessageType.CREATE_ROOM, {
            playerCount: options.playerCount
        });
    }

    joinRoom(input) {
        const payload = typeof input === "object" && input !== null
            ? input
            : { roomCode: input };
        return this.#sendRequest(LobbyMessageType.JOIN_ROOM, {
            roomCode: payload.roomCode,
            displayName: payload.displayName
        });
    }

    setReady(ready = true) {
        return this.#sendRequest(LobbyMessageType.PLAYER_READY, {
            ready: Boolean(ready)
        });
    }

    leaveRoom() {
        return this.#sendRequest(LobbyMessageType.LEAVE_ROOM, {});
    }

    closeRoom() {
        return this.#sendRequest(LobbyMessageType.CLOSE_ROOM, {});
    }

    resumeRoom({ roomCode, resumeToken }) {
        return this.#sendRequest(LobbyMessageType.RESUME_ROOM, {
            roomCode,
            resumeToken
        });
    }

    activateSession(sessionId, publicAssignments = null) {
        return this.#sendRequest(SessionControlMessageType.ACTIVATE_SESSION, {
            sessionId,
            publicAssignments
        });
    }

    sendPlayerBinding(binding, { targetClientId = null } = {}) {
        if (this.destroyed || !this.socket) {
            return false;
        }

        this.socket.emit(LOBBY_REQUEST_EVENT, {
            type: SessionControlMessageType.PLAYER_BINDING_ASSIGNED,
            requestId: null,
            payload: {
                binding: typeof binding?.toJSON === "function"
                    ? binding.toJSON()
                    : binding,
                targetClientId
            }
        });
        return true;
    }

    sendResumeSession(sessionId) {
        if (this.destroyed || !this.socket) {
            return false;
        }

        this.socket.emit(LOBBY_REQUEST_EVENT, {
            type: SessionControlMessageType.RESUME_SESSION,
            requestId: null,
            payload: { sessionId }
        });
        return true;
    }

    sendSessionResumed(sessionId) {
        if (this.destroyed || !this.socket) {
            return false;
        }

        this.socket.emit(LOBBY_REQUEST_EVENT, {
            type: SessionControlMessageType.SESSION_RESUMED,
            requestId: null,
            payload: { sessionId }
        });
        return true;
    }

    onMessage(handler) {
        this.subscribers.add(handler);
        return () => this.subscribers.delete(handler);
    }

    getState() {
        return structuredClone(this.state);
    }

    destroy() {
        if (this.destroyed) {
            return;
        }

        this.destroyed = true;
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timer);
            pending.cleanup?.();
        }
        this.pending.clear();
        this.subscribers.clear();
        if (this.socket) {
            this.socket.off(LOBBY_RESPONSE_EVENT, this.boundResponseHandler);
            this.socket.off(CONNECTION_ERROR_EVENT, this.boundErrorHandler);
            this.socket.off("connect", this.boundConnectHandler);
            this.socket.off("disconnect", this.boundDisconnectHandler);
        }
        this.state.connectionState = LobbyConnectionState.CLOSED;
    }

    #sendRequest(type, payload) {
        if (this.destroyed || !this.socket) {
            return Promise.resolve({
                type: LobbyMessageType.ROOM_REJECTED,
                payload: { code: "DISCONNECTED" }
            });
        }

        const requestId = this.requestIdFactory();
        const message = { type, requestId, payload };
        const promise = new Promise(resolve => {
            const timer = setTimeout(() => {
                if (!this.pending.has(requestId)) return;
                const pending = this.pending.get(requestId);
                this.pending.delete(requestId);
                pending.cleanup?.();
                resolve({
                    type: LobbyMessageType.ROOM_REJECTED,
                    requestId,
                    payload: {
                        code: "REQUEST_TIMEOUT",
                        message: "Lobby request timed out"
                    }
                });
            }, this.requestTimeoutMs);
            let cleanup = null;
            const send = () => {
                if (!this.pending.has(requestId) || this.destroyed || !this.socket) {
                    return;
                }
                this.socket.emit(LOBBY_REQUEST_EVENT, message);
            };
            if (this.socket.connected) {
                cleanup = () => {};
                this.pending.set(requestId, { resolve, timer, cleanup });
                send();
                return;
            }

            const handleConnect = () => {
                cleanup?.();
                send();
            };
            cleanup = () => {
                this.socket?.off?.("connect", handleConnect);
            };
            this.pending.set(requestId, { resolve, timer, cleanup });
            this.socket.once("connect", handleConnect);
        });
        return promise;
    }

    #handleMessage(message) {
        if (this.destroyed) {
            return;
        }

        this.#applyMessage(message);
        if (message.requestId && this.pending.has(message.requestId)) {
            const pending = this.pending.get(message.requestId);
            this.pending.delete(message.requestId);
            clearTimeout(pending.timer);
            pending.cleanup?.();
            pending.resolve(message);
        }

        for (const subscriber of [...this.subscribers]) {
            subscriber(message, this.getState());
        }
    }

    #applyMessage(message = {}) {
        const payload = message.payload || {};
        const room = payload.room || {};

        if (message.type === LobbyMessageType.CLIENT_ASSIGNED) {
            this.state.clientId = payload.clientId || null;
            this.state.lanAddress = payload.lanAddress || null;
            this.state.socketServerPort = payload.socketServerPort || null;
            this.state.connectionState = LobbyConnectionState.CONNECTED;
        }

        if (
            message.type === LobbyMessageType.ROOM_CREATED ||
            message.type === LobbyMessageType.ROOM_JOINED ||
            message.type === LobbyMessageType.ROOM_ROSTER_UPDATED
        ) {
            this.state.clientId = payload.clientId || this.state.clientId;
            this.state.role = payload.role || this.state.role;
            this.state.roomId = room.roomId || null;
            this.state.roomCode = room.roomCode || null;
            this.state.playerCount = room.playerCount || this.state.playerCount;
            this.state.capacity = room.capacity || room.playerCount || this.state.capacity;
            this.state.roster = Array.isArray(room.roster)
                ? structuredClone(room.roster)
                : [];
            this.state.canStart = Boolean(room.canStart);
            this.state.startDisabledReason = room.startDisabledReason || null;
            this.state.peerConnected = Boolean(
                room.guestClientId ||
                this.state.roster.some(member => member.connectionState === "CONNECTED")
            );
            this.state.resumeToken = payload.resumeToken || this.state.resumeToken;
            this.state.connectionState = room.status === "ACTIVE"
                ? LobbyConnectionState.ACTIVE
                : this.state.canStart
                    ? LobbyConnectionState.READY
                    : LobbyConnectionState.IN_ROOM;
            this.state.error = null;
        }

        if (message.type === LobbyMessageType.ROOM_RESUMED) {
            this.state.clientId = payload.clientId || this.state.clientId;
            this.state.role = payload.role || this.state.role;
            this.state.roomId = payload.roomId || room.roomId || this.state.roomId;
            this.state.roomCode = payload.roomCode || room.roomCode || this.state.roomCode;
            this.state.sessionId = payload.sessionId || this.state.sessionId;
            this.state.resumeToken = payload.resumeToken || this.state.resumeToken;
            if (Array.isArray(room.roster)) {
                this.state.roster = structuredClone(room.roster);
            }
            this.state.peerConnected = true;
            this.state.connectionState = LobbyConnectionState.RESUMING;
            this.state.error = null;
        }

        if (message.type === LobbyMessageType.PEER_CONNECTED) {
            this.state.peerConnected = true;
            if (Array.isArray(room.roster)) {
                this.state.roster = structuredClone(room.roster);
                this.state.canStart = Boolean(room.canStart);
                this.state.startDisabledReason = room.startDisabledReason || null;
            }
            this.state.connectionState = this.state.canStart
                ? LobbyConnectionState.READY
                : LobbyConnectionState.IN_ROOM;
        }

        if (message.type === LobbyMessageType.PEER_DISCONNECTED) {
            if (Array.isArray(room.roster)) {
                this.state.roster = structuredClone(room.roster);
                this.state.canStart = Boolean(room.canStart);
                this.state.startDisabledReason = room.startDisabledReason || null;
            }
            this.state.peerConnected = this.state.roster.some(member =>
                member.connectionState === "CONNECTED"
            );
            this.state.connectionState = this.state.canStart
                ? LobbyConnectionState.READY
                : LobbyConnectionState.IN_ROOM;
        }

        if (message.type === SessionControlMessageType.SESSION_STARTED) {
            this.state.sessionId = payload.sessionId || null;
            if (Array.isArray(room.roster)) {
                this.state.roster = structuredClone(room.roster);
            }
            this.state.connectionState = LobbyConnectionState.ACTIVE;
        }

        if (message.type === SessionControlMessageType.SESSION_CLOSED) {
            this.state.connectionState = LobbyConnectionState.CLOSED;
            this.state.peerConnected = false;
            this.state.error = payload.reasonCode || "SESSION_CLOSED";
        }

        if (message.type === SessionControlMessageType.PEER_RECONNECTING) {
            if (Array.isArray(room.roster)) {
                this.state.roster = structuredClone(room.roster);
            }
            this.state.peerConnected = this.state.roster.some(member =>
                member.connectionState === "CONNECTED"
            );
            this.state.connectionState = room.status === "ACTIVE"
                ? LobbyConnectionState.ACTIVE
                : LobbyConnectionState.RECONNECTING;
        }

        if (message.type === SessionControlMessageType.PEER_RESUMED) {
            if (Array.isArray(room.roster)) {
                this.state.roster = structuredClone(room.roster);
            }
            this.state.peerConnected = true;
            this.state.connectionState = LobbyConnectionState.ACTIVE;
        }

        if (message.type === LobbyMessageType.ROOM_REJECTED) {
            this.#setError(payload.code || "LOBBY_REJECTED");
            return;
        }

        if (message.type === LobbyMessageType.RESUME_REJECTED) {
            this.#setError(payload.reasonCode || "RESUME_REJECTED");
            return;
        }

        if (message.type === SessionControlMessageType.RESUME_FAILED) {
            this.#setError(payload.reasonCode || "RESUME_FAILED");
            return;
        }

        this.#notify();
    }

    #setError(code) {
        this.state.error = code;
        this.state.connectionState = LobbyConnectionState.ERROR;
        this.#notify();
    }

    #notify() {
        for (const subscriber of [...this.subscribers]) {
            subscriber(null, this.getState());
        }
    }
}
