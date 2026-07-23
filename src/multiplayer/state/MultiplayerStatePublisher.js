import { TransportMessageType } from "../transport/TransportMessageType.js";

export class MultiplayerStatePublisher {
    #sessionId;
    #getProjection;
    #sendState;
    #revision;

    constructor({
        sessionId = "local-session",
        getProjection,
        sendState
    }) {
        this.#sessionId = sessionId;
        this.#getProjection = getProjection;
        this.#sendState = sendState;
        this.#revision = 0;
    }

    publish(viewerId, { targetClientId = null } = {}) {
        this.#revision += 1;
        const message = {
            type: TransportMessageType.STATE_UPDATED,
            sessionId: this.#sessionId,
            revision: this.#revision,
            payload: {
                projection: this.#getProjection(viewerId)
            }
        };

        this.#sendState(message, { targetClientId });
        return message;
    }

    publishGuestState(viewerId, options = {}) {
        return this.publish(viewerId, options);
    }

    getRevision() {
        return this.#revision;
    }
}
