import { GuestTransportClient } from "../transport/GuestTransportClient.js";

export function createGuestGameSession({
    transport,
    sessionId = "local-session",
    playerId
} = {}) {
    const subscribers = new Set();
    const state = {
        connectionState: "disconnected",
        playerId,
        revision: 0,
        projection: null,
        pendingAction: null,
        lastActionResult: null
    };
    let destroyed = false;

    function notify() {
        if (destroyed) {
            return;
        }

        const snapshot = structuredClone(state);
        for (const subscriber of [...subscribers]) {
            subscriber(snapshot);
        }
    }

    const client = new GuestTransportClient({
        transport,
        sessionId,
        playerId,
        onStateUpdated: update => {
            if (destroyed) return;
            state.revision = update.revision;
            state.projection = update.projection;
            notify();
        },
        onActionResult: result => {
            if (destroyed) return;
            state.lastActionResult = result;
            notify();
        },
        onPendingActionChanged: pendingAction => {
            if (destroyed) return;
            state.pendingAction = pendingAction;
            notify();
        },
        onConnectionChanged: connectionState => {
            if (destroyed) return;
            state.connectionState = connectionState;
            notify();
        }
    });

    return {
        connect() {
            client.connect();
            return this;
        },
        sendAction(action) {
            return client.sendAction(action);
        },
        getState() {
            return structuredClone(state);
        },
        subscribe(handler) {
            subscribers.add(handler);
            return () => subscribers.delete(handler);
        },
        destroy() {
            destroyed = true;
            state.pendingAction = null;
            client.destroy();
            subscribers.clear();
            transport.destroy?.();
        }
    };
}
