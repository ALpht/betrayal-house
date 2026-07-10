export class ScenarioRegistry {
    #definitions = new Map();

    register(definition) {
        const id = definition.metadata.id;
        this.#definitions.set(id, definition);
    }

    get(id) {
        return this.#definitions.get(id) || null;
    }

    has(id) {
        return this.#definitions.has(id);
    }

    getAll() {
        return [...this.#definitions.values()];
    }
}
