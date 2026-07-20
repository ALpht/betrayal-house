import { TransportMessageType } from "./TransportMessageType.js";

const TYPES = new Set(Object.values(TransportMessageType));

export function validateTransportEnvelope(message) {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
        return { valid: false, error: "Envelope must be an object" };
    }

    if (!TYPES.has(message.type)) {
        return { valid: false, error: "Unsupported transport message type" };
    }

    if (!message.sessionId || typeof message.sessionId !== "string") {
        return { valid: false, error: "Envelope sessionId is required" };
    }

    if (!Object.hasOwn(message, "payload")) {
        return { valid: false, error: "Envelope payload is required" };
    }

    if (message.type === TransportMessageType.PLAYER_ACTION) {
        if (!message.senderId || typeof message.senderId !== "string") {
            return { valid: false, error: "PLAYER_ACTION senderId is required" };
        }

        if (!Number.isInteger(message.sequence) || message.sequence < 1) {
            return { valid: false, error: "PLAYER_ACTION sequence must be a positive integer" };
        }
    }

    if (message.type === TransportMessageType.STATE_UPDATED) {
        if (!Number.isInteger(message.revision) || message.revision < 1) {
            return { valid: false, error: "STATE_UPDATED revision must be a positive integer" };
        }
    }

    if (message.type === TransportMessageType.ACTION_RESULT) {
        if (!message.payload || typeof message.payload !== "object") {
            return { valid: false, error: "ACTION_RESULT payload must be an object" };
        }

        if (!Number.isInteger(message.payload.sequence) || message.payload.sequence < 1) {
            return { valid: false, error: "ACTION_RESULT sequence must be a positive integer" };
        }

        if (typeof message.payload.accepted !== "boolean") {
            return { valid: false, error: "ACTION_RESULT accepted must be boolean" };
        }

        if (message.payload.accepted === true && message.payload.reasonCode !== null) {
            return { valid: false, error: "ACTION_RESULT accepted result must have null reasonCode" };
        }

        if (
            message.payload.accepted === false &&
            (typeof message.payload.reasonCode !== "string" || message.payload.reasonCode.length === 0)
        ) {
            return { valid: false, error: "ACTION_RESULT rejected result must have reasonCode" };
        }
    }

    return { valid: true, error: null };
}

export function createActionResult({
    sessionId,
    sequence,
    accepted,
    reasonCode
}) {
    const message = {
        type: TransportMessageType.ACTION_RESULT,
        sessionId,
        payload: {
            sequence,
            accepted,
            reasonCode
        }
    };
    const validation = validateTransportEnvelope(message);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    return message;
}

export function createTransportError({
    sessionId = "unknown",
    code = "TRANSPORT_ERROR",
    message = "Transport error"
} = {}) {
    return {
        type: TransportMessageType.TRANSPORT_ERROR,
        sessionId,
        payload: { code, message }
    };
}
