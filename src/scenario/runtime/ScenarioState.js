export class ScenarioState {
    #data = {};

    set(key, value) {
        structuredClone(value);
        this.#data[key] = value;
    }

    get(key) {
        return this.#data[key];
    }

    has(key) {
        return key in this.#data;
    }

    remove(key) {
        delete this.#data[key];
    }

    increment(key, amount = 1) {
        const current = this.#data[key];
        const base = typeof current === "number" ? current : 0;
        this.#data[key] = base + amount;
    }

    serialize() {
        return structuredClone(this.#data);
    }

    deserialize(data) {
        this.#data = structuredClone(data);
    }
}
