import { validateTransportEnvelope } from "./TransportEnvelope.js";

export class TransportSerializer {
    static serialize(message) {
        const validation = validateTransportEnvelope(message);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return JSON.stringify(message);
    }

    static deserialize(serialized) {
        let message;
        try {
            message = JSON.parse(serialized);
        } catch (_error) {
            throw new Error("Transport payload is not valid JSON");
        }

        const validation = validateTransportEnvelope(message);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        return message;
    }
}
