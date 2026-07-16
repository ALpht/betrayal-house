export class ScenarioCatalog {
    #registry;

    constructor(registry) {
        this.#registry = registry;
    }

    get(id) {
        return this.#registry.get(id);
    }

    has(id) {
        return this.#registry.has(id);
    }

    getAll() {
        return this.#registry.getAll();
    }

    findByTag(tag) {
        return this.#registry.getAll().filter(def => {
            const tags = def.metadata.tags;
            return tags && Array.isArray(tags) && tags.includes(tag);
        });
    }

    findByDifficulty(level) {
        return this.#registry.getAll().filter(def => {
            return def.metadata.difficulty === level;
        });
    }
}
