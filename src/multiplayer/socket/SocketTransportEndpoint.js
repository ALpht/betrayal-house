import { io } from "socket.io-client";
import { TransportSerializer } from "../transport/TransportSerializer.js";

const TRANSPORT_EVENT = "transport:message";
const CONNECTION_ERROR_EVENT = "connection:error";

export class SocketTransportEndpoint {
    constructor({
        url,
        socket = null,
        trustedSenderMode = false
    } = {}) {
        this.url = url;
        this.socket = socket;
        this.trustedSenderMode = trustedSenderMode;
        this.listeners = new Set();
        this.destroyed = false;
        this.boundTransportHandler = packet => this.#deliver(packet);
        this.boundErrorHandler = error => this.#deliverTransportError(error);
    }

    connect() {
        if (this.destroyed) {
            return this;
        }

        if (!this.socket) {
            this.socket = io(this.url, {
                transports: ["websocket"],
                autoConnect: false,
                reconnection: false,
                forceNew: true,
                multiplex: false
            });
        }

        this.socket.on(TRANSPORT_EVENT, this.boundTransportHandler);
        this.socket.on(CONNECTION_ERROR_EVENT, this.boundErrorHandler);
        if (!this.socket.connected) {
            this.socket.connect();
        }

        return this;
    }

    send(message, options = {}) {
        if (this.destroyed || !this.socket || !this.socket.connected) {
            return false;
        }

        const serializedEnvelope = TransportSerializer.serialize(message);
        this.socket.emit(TRANSPORT_EVENT, {
            serializedEnvelope,
            targetClientId: options.targetClientId || message.targetClientId || null
        });
        return true;
    }

    subscribe(handler) {
        if (this.destroyed) {
            return () => {};
        }

        this.listeners.add(handler);
        return () => this.listeners.delete(handler);
    }

    destroy() {
        if (this.destroyed) {
            return;
        }

        this.destroyed = true;
        this.listeners.clear();
        if (this.socket) {
            this.socket.off(TRANSPORT_EVENT, this.boundTransportHandler);
            this.socket.off(CONNECTION_ERROR_EVENT, this.boundErrorHandler);
        }
    }

    isDestroyed() {
        return this.destroyed;
    }

    #deliver(packet = {}) {
        if (this.destroyed) {
            return;
        }

        let message = TransportSerializer.deserialize(packet.serializedEnvelope);
        if (this.trustedSenderMode && packet.senderId) {
            message = {
                ...message,
                senderId: packet.senderId
            };
        }

        for (const listener of [...this.listeners]) {
            listener(message);
        }
    }

    #deliverTransportError(error = {}) {
        for (const listener of [...this.listeners]) {
            listener({
                type: "TRANSPORT_ERROR",
                sessionId: "unknown",
                payload: {
                    code: error.code || "CONNECTION_ERROR",
                    message: error.message || error.code || "Connection error"
                }
            });
        }
    }
}
