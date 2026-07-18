import { io } from "socket.io-client";
import {
    LobbyMessageType,
    SessionControlMessageType
} from "./LobbyMessageType.js";
import {
    createInitialLobbyState,
    LobbyConnectionState
} from "./LobbyState.js";

const LOBBY_REQUEST_EVENT = "lobby:request";
const LOBBY_RESPONSE_EVENT = "lobby:response";
const CONNECTION_ERROR_EVENT = "connection:error";

function createRequestId() {
    return `request-${crypto.randomUUID()}`;
}

export class LobbyClient {
    constructor({
        url,
        socket = null,
        requestIdFactory = createRequestId
    } = {}) {
        this.url = url;
        this.socket = socket;
        this.requestIdFactory = requestIdFactory;
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

    createRoom() {
        return this.#sendRequest(LobbyMessageType.CREATE_ROOM, {});
    }

    joinRoom(roomCode) {
        return this.#sendRequest(LobbyMessageType.JOIN_ROOM, { roomCode });
    }

    resumeRoom({ roomCode, resumeToken }) {
        return this.#sendRequest(LobbyMessageType.RESUME_ROOM, {
            roomCode,
            resumeToken
        });
    }

    activateSession(sessionId) {
        return this.#sendRequest(SessionControlMessageType.ACTIVATE_SESSION, {
            sessionId
        });
    }

    sendPlayerBinding(binding) {
        if (this.destroyed || !this.socket) {
            return false;
        }

        this.socket.emit(LOBBY_REQUEST_EVENT, {
            type: SessionControlMessageType.PLAYER_BINDING_ASSIGNED,
            requestId: null,
            payload: {
                binding: typeof binding?.toJSON === "function"
                    ? binding.toJSON()
                    : binding
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
            this.pending.set(requestId, resolve);
        });
        this.socket.emit(LOBBY_REQUEST_EVENT, message);
        return promise;
    }

    #handleMessage(message) {
        if (this.destroyed) {
            return;
        }

        this.#applyMessage(message);
        if (message.requestId && this.pending.has(message.requestId)) {
            const resolve = this.pending.get(message.requestId);
            this.pending.delete(message.requestId);
            resolve(message);
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
            this.state.connectionState = LobbyConnectionState.CONNECTED;
        }

        if (
            message.type === LobbyMessageType.ROOM_CREATED ||
            message.type === LobbyMessageType.ROOM_JOINED
        ) {
            this.state.clientId = payload.clientId || this.state.clientId;
            this.state.role = payload.role || this.state.role;
            this.state.roomId = room.roomId || null;
            this.state.roomCode = room.roomCode || null;
            this.state.peerConnected = Boolean(room.guestClientId);
            this.state.resumeToken = payload.resumeToken || this.state.resumeToken;
            this.state.connectionState = room.status === "READY"
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
            this.state.peerConnected = true;
            this.state.connectionState = LobbyConnectionState.RESUMING;
            this.state.error = null;
        }

        if (message.type === LobbyMessageType.PEER_CONNECTED) {
            this.state.peerConnected = true;
            this.state.connectionState = LobbyConnectionState.READY;
        }

        if (message.type === LobbyMessageType.PEER_DISCONNECTED) {
            this.state.peerConnected = false;
            this.state.connectionState = LobbyConnectionState.IN_ROOM;
        }

        if (message.type === SessionControlMessageType.SESSION_STARTED) {
            this.state.sessionId = payload.sessionId || null;
            this.state.connectionState = LobbyConnectionState.ACTIVE;
        }

        if (message.type === SessionControlMessageType.SESSION_CLOSED) {
            this.state.connectionState = LobbyConnectionState.CLOSED;
            this.state.peerConnected = false;
            this.state.error = payload.reasonCode || "SESSION_CLOSED";
        }

        if (message.type === SessionControlMessageType.PEER_RECONNECTING) {
            this.state.peerConnected = false;
            this.state.connectionState = LobbyConnectionState.RECONNECTING;
        }

        if (message.type === SessionControlMessageType.PEER_RESUMED) {
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
