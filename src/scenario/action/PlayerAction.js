export class PlayerAction {
    #id;
    #type;
    #playerId;
    #payload;

    constructor({ id, type, playerId, payload = {} }) {
        if (!id) {
            throw new Error("PlayerAction: id is required");
        }

        this.#id = id;
        this.#type = type;
        this.#playerId = playerId;
        this.#payload = structuredClone(payload);

        Object.freeze(this);
    }

    get id() {
        return this.#id;
    }

    get type() {
        return this.#type;
    }

    get playerId() {
        return this.#playerId;
    }

    get payload() {
        return structuredClone(this.#payload);
    }

    toJSON() {
        return {
            id: this.#id,
            type: this.#type,
            playerId: this.#playerId,
            payload: structuredClone(this.#payload)
        };
    }
}
