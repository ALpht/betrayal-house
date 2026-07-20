import { TransportSerializer } from "./TransportSerializer.js";

class InMemoryEndpoint {
    #listeners;
    #peer;
    #destroyed;

    constructor() {
        this.#listeners = new Set();
        this.#peer = null;
        this.#destroyed = false;
    }

    setPeer(peer) {
        this.#peer = peer;
    }

    send(message) {
        if (this.#destroyed) {
            return false;
        }

        if (!this.#peer || this.#peer.isDestroyed()) {
            return false;
        }

        const serialized = TransportSerializer.serialize(message);
        const delivered = TransportSerializer.deserialize(serialized);
        this.#peer.deliver(delivered);
        return true;
    }

    subscribe(handler) {
        if (this.#destroyed) {
            return () => {};
        }

        this.#listeners.add(handler);
        return () => {
            this.#listeners.delete(handler);
        };
    }

    deliver(message) {
        if (this.#destroyed) {
            return;
        }

        for (const listener of [...this.#listeners]) {
            listener(message);
        }
    }

    destroy() {
        if (this.#destroyed) {
            return;
        }

        this.#destroyed = true;
        this.#listeners.clear();
        this.#peer = null;
    }

    isDestroyed() {
        return this.#destroyed;
    }
}

export class InMemoryTransport {
    static createPair() {
        const hostEndpoint = new InMemoryEndpoint();
        const guestEndpoint = new InMemoryEndpoint();
        hostEndpoint.setPeer(guestEndpoint);
        guestEndpoint.setPeer(hostEndpoint);

        return {
            hostEndpoint,
            guestEndpoint
        };
    }
}
