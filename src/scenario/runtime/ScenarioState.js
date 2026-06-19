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

    serialize() {
        return structuredClone(this.#data);
    }

    deserialize(data) {
        this.#data = structuredClone(data);
    }
}
