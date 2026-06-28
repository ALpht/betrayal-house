import { HauntScenario } from "../HauntScenario.js";

export class RuntimeNotFoundError extends Error {
    #runtimeId;

    constructor(runtimeId) {
        super(`Runtime not found for id: "${runtimeId}"`);
        this.name = "RuntimeNotFoundError";
        this.#runtimeId = runtimeId;
    }

    get runtimeId() { return this.#runtimeId; }
}

export class RuntimeRegistry {
    #runtimes = new Map();

    register(id, runtimeClass) {
        if (!id || typeof id !== "string") {
            throw new Error("RuntimeRegistry: id must be a non-empty string");
        }

        if (!runtimeClass || typeof runtimeClass !== "function" || !runtimeClass.prototype) {
            throw new Error("RuntimeRegistry: runtimeClass must be a class");
        }

        if (!(runtimeClass.prototype instanceof HauntScenario)) {
            throw new Error(`RuntimeRegistry: runtimeClass for "${id}" must extend HauntScenario`);
        }

        if (this.#runtimes.has(id)) {
            throw new Error(`RuntimeRegistry: runtime "${id}" is already registered (use unregister first)`);
        }

        this.#runtimes.set(id, runtimeClass);
    }

    get(id) {
        if (!this.#runtimes.has(id)) {
            throw new RuntimeNotFoundError(id);
        }
        return this.#runtimes.get(id);
    }

    has(id) {
        return this.#runtimes.has(id);
    }

    getAll() {
        return [...this.#runtimes.entries()].map(([id, runtimeClass]) => ({ id, runtimeClass }));
    }

    unregister(id) {
        if (!this.#runtimes.has(id)) {
            return false;
        }
        return this.#runtimes.delete(id);
    }

    clear() {
        this.#runtimes.clear();
    }
}
