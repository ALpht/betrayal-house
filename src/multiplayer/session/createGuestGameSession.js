import { GuestTransportClient } from "../transport/GuestTransportClient.js";

export function createGuestGameSession({
    transport,
    sessionId = "local-session",
    playerId,
    initialSequence = 0,
    initialRevision = 0,
    recoveryBaseline = false
} = {}) {
    const subscribers = new Set();
    const state = {
        connectionState: "disconnected",
        playerId,
        revision: initialRevision,
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
        },
        initialSequence,
        initialRevision,
        recoveryBaseline
    });

    return {
        connect() {
            client.connect();
            return this;
        },
        sendAction(action) {
            return client.sendAction(action);
        },
        clearPendingForConnectionLost() {
            return client.clearPendingForConnectionLost();
        },
        getState() {
            return structuredClone(state);
        },
        getSequence() {
            return client.getSequence();
        },
        getPendingAction() {
            return client.getPendingAction();
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
