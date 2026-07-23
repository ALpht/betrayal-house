import { PlayerAction } from "../../scenario/action/PlayerAction.js";
import { TransportMessageType } from "./TransportMessageType.js";
import {
    createActionResult,
    createTransportError,
    validateTransportEnvelope
} from "./TransportEnvelope.js";

function validatePlayerActionShape(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return { valid: false, error: "PLAYER_ACTION payload must be an object" };
    }

    if (typeof payload.id !== "string" || payload.id.length === 0) {
        return { valid: false, error: "PLAYER_ACTION payload id is required" };
    }

    if (typeof payload.type !== "string" || payload.type.length === 0) {
        return { valid: false, error: "PLAYER_ACTION payload type is required" };
    }

    if (typeof payload.playerId !== "string" || payload.playerId.length === 0) {
        return { valid: false, error: "PLAYER_ACTION payload playerId is required" };
    }

    return { valid: true, error: null };
}

function toPlayerAction(payload) {
    return new PlayerAction({
        id: payload?.id,
        type: payload?.type,
        playerId: payload?.playerId,
        payload: payload?.payload || {}
    });
}

export class HostTransportGateway {
    #transport;
    #executeAction;
    #publishState;
    #authorizeSender;
    #actionCoordinator;
    #sessionId;
    #unsubscribe;
    #lastAcceptedSequenceBySender;
    #destroyed;

    constructor({
        transport,
        executeAction,
        publishState,
        authorizeSender = ({ senderId, actionPlayerId }) => senderId === actionPlayerId,
        actionCoordinator = null,
        sessionId = "local-session"
    }) {
        this.#transport = transport;
        this.#executeAction = executeAction;
        this.#publishState = publishState;
        this.#authorizeSender = authorizeSender;
        this.#actionCoordinator = actionCoordinator;
        this.#sessionId = sessionId;
        this.#unsubscribe = null;
        this.#lastAcceptedSequenceBySender = new Map();
        this.#destroyed = false;
    }

    init() {
        if (this.#destroyed || this.#unsubscribe) {
            return this;
        }

        this.#unsubscribe = this.#transport.subscribe(
            message => this.#handleMessage(message)
        );
        return this;
    }

    #handleMessage(message) {
        const validation = validateTransportEnvelope(message);
        if (!validation.valid) {
            this.#sendTransportError(validation.error);
            return;
        }

        if (message.sessionId !== this.#sessionId) {
            this.#sendTransportError("Session not found");
            return;
        }

        if (message.type !== TransportMessageType.PLAYER_ACTION) {
            this.#sendTransportError("Unsupported host message type");
            return;
        }

        const actionShape = validatePlayerActionShape(message.payload);
        if (!actionShape.valid) {
            this.#sendTransportError(actionShape.error);
            return;
        }

        if (this.#actionCoordinator) {
            const result = this.#actionCoordinator.handleGuestAction({
                senderId: message.senderId,
                sequence: message.sequence,
                actionPayload: message.payload
            });
            this.#sendActionResult(result, message.senderId);

            if (result.shouldPublish) {
                this.#publishState(message.senderId);
            }
            return;
        }

        let action;
        try {
            action = toPlayerAction(message.payload);
        } catch (error) {
            this.#sendTransportError(error.message);
            return;
        }

        if (!this.#authorizeSender({
            senderId: message.senderId,
            actionPlayerId: action.playerId
        })) {
            this.#sendTransportError("Sender is not authorized for action player");
            return;
        }

        const lastAccepted =
            this.#lastAcceptedSequenceBySender.get(message.senderId) || 0;

        if (message.sequence <= lastAccepted) {
            this.#sendTransportError("Duplicate or stale action sequence");
            return;
        }

        const result = this.#executeAction(action);
        this.#lastAcceptedSequenceBySender.set(message.senderId, message.sequence);

        if (result?.success) {
            this.#publishState(message.senderId);
        }
    }

    #sendTransportError(message, targetClientId = null) {
        this.#transport.send(createTransportError({
            sessionId: this.#sessionId,
            message
        }), targetClientId ? { targetClientId } : {});
    }

    #sendActionResult(result, targetClientId = null) {
        this.#transport.send(createActionResult({
            sessionId: this.#sessionId,
            sequence: result.sequence,
            accepted: result.accepted,
            reasonCode: result.reasonCode
        }), targetClientId ? { targetClientId } : {});
    }

    getLastAcceptedSequence(senderId) {
        return this.#lastAcceptedSequenceBySender.get(senderId) || 0;
    }

    destroy() {
        if (this.#destroyed) {
            return;
        }

        this.#destroyed = true;
        this.#unsubscribe?.();
        this.#unsubscribe = null;
        this.#lastAcceptedSequenceBySender.clear();
    }
}
