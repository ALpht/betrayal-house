import { TransportMessageType } from "./TransportMessageType.js";

export class GuestTransportClient {
    #transport;
    #sessionId;
    #playerId;
    #onStateUpdated;
    #onActionResult;
    #onPendingActionChanged;
    #onConnectionChanged;
    #unsubscribe;
    #sequence;
    #revision;
    #pendingAction;
    #recoveryBaseline;
    #minimumRecoveryRevision;
    #connectionState;
    #destroyed;

    constructor({
        transport,
        sessionId = "local-session",
        playerId,
        onStateUpdated = () => {},
        onActionResult = () => {},
        onPendingActionChanged = () => {},
        onConnectionChanged = () => {},
        initialSequence = 0,
        initialRevision = 0,
        recoveryBaseline = false
    }) {
        this.#transport = transport;
        this.#sessionId = sessionId;
        this.#playerId = playerId;
        this.#onStateUpdated = onStateUpdated;
        this.#onActionResult = onActionResult;
        this.#onPendingActionChanged = onPendingActionChanged;
        this.#onConnectionChanged = onConnectionChanged;
        this.#unsubscribe = null;
        this.#sequence = initialSequence;
        this.#revision = initialRevision;
        this.#pendingAction = null;
        this.#recoveryBaseline = recoveryBaseline;
        this.#minimumRecoveryRevision = initialRevision;
        this.#connectionState = "disconnected";
        this.#destroyed = false;
    }

    connect() {
        if (this.#destroyed || this.#unsubscribe) {
            return this;
        }

        this.#connectionState = "connected";
        this.#unsubscribe = this.#transport.subscribe(
            message => this.#handleMessage(message)
        );
        this.#onConnectionChanged(this.#connectionState);
        return this;
    }

    sendAction(playerAction) {
        if (this.#destroyed || this.#connectionState !== "connected") {
            return false;
        }

        if (this.#pendingAction) {
            return false;
        }

        const sequence = this.#sequence + 1;
        const pendingAction = {
            sequence,
            type: playerAction?.type || null
        };
        this.#pendingAction = pendingAction;
        this.#onPendingActionChanged(structuredClone(this.#pendingAction));

        let sent = false;
        try {
            sent = this.#transport.send({
                type: TransportMessageType.PLAYER_ACTION,
                sessionId: this.#sessionId,
                senderId: this.#playerId,
                sequence,
                payload: typeof playerAction?.toJSON === "function"
                    ? playerAction.toJSON()
                    : structuredClone(playerAction)
            });
        } catch (_error) {
            sent = false;
        }

        if (!sent) {
            this.#pendingAction = null;
            this.#onPendingActionChanged(null);
            this.#onActionResult({
                sequence,
                accepted: false,
                reasonCode: "SESSION_DESTROYED"
            });
            return false;
        }

        this.#sequence = sequence;
        return true;
    }

    #handleMessage(message) {
        if (message.sessionId !== this.#sessionId) {
            return;
        }

        if (message.type === TransportMessageType.STATE_UPDATED) {
            if (this.#recoveryBaseline) {
                if (message.revision < this.#minimumRecoveryRevision) {
                    return;
                }

                this.#recoveryBaseline = false;
                this.#revision = message.revision;
                this.#onStateUpdated({
                    revision: this.#revision,
                    projection: structuredClone(message.payload?.projection || null),
                    recoveryBaseline: true
                });
                return;
            }

            if (message.revision <= this.#revision) {
                return;
            }

            this.#revision = message.revision;
            this.#onStateUpdated({
                revision: this.#revision,
                projection: structuredClone(message.payload?.projection || null)
            });
            return;
        }

        if (message.type === TransportMessageType.ACTION_RESULT) {
            const result = structuredClone(message.payload);
            if (this.#pendingAction?.sequence === result.sequence) {
                this.#pendingAction = null;
                this.#onPendingActionChanged(null);
            }
            this.#onActionResult(result);
            return;
        }

        if (message.type === TransportMessageType.CONNECTION_READY) {
            const revision = message.payload?.revision || 0;
            if (revision > this.#revision) {
                this.#revision = revision;
                this.#onStateUpdated({
                    revision: this.#revision,
                    projection: structuredClone(message.payload?.projection || null)
                });
            }
        }
    }

    disconnect() {
        if (this.#connectionState === "disconnected") {
            return;
        }

        this.#connectionState = "disconnected";
        this.#unsubscribe?.();
        this.#unsubscribe = null;
        this.#onConnectionChanged(this.#connectionState);
    }

    clearPendingForConnectionLost() {
        if (!this.#pendingAction) {
            return null;
        }

        const result = {
            sequence: this.#pendingAction.sequence,
            accepted: false,
            reasonCode: "CONNECTION_LOST",
            source: "LOCAL_TRANSPORT"
        };
        this.#pendingAction = null;
        this.#onPendingActionChanged(null);
        this.#onActionResult(result);
        return result;
    }

    destroy() {
        if (this.#destroyed) {
            return;
        }

        this.#pendingAction = null;
        this.#onPendingActionChanged(null);
        this.disconnect();
        this.#destroyed = true;
    }

    getRevision() {
        return this.#revision;
    }

    getSequence() {
        return this.#sequence;
    }

    getPendingAction() {
        return this.#pendingAction
            ? structuredClone(this.#pendingAction)
            : null;
    }

    getConnectionState() {
        return this.#connectionState;
    }
}
