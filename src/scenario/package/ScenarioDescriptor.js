import { BundleContract } from "./BundleContract.js";

export class ScenarioDescriptor {
    #id;
    #runtimeId;
    #title;
    #description;
    #difficulty;
    #tags;
    #version;

    constructor({ id, runtimeId, title, description, difficulty, tags, version }) {
        if (!id || typeof id !== "string") {
            throw new Error("ScenarioDescriptor: id is required and must be a string");
        }
        if (!title || typeof title !== "string") {
            throw new Error("ScenarioDescriptor: title is required and must be a string");
        }
        this.#id = id;
        this.#runtimeId = runtimeId || id;
        this.#title = title;
        this.#description = description || "";
        this.#difficulty = typeof difficulty === "number" ? difficulty : 1;
        this.#tags = Array.isArray(tags) ? [...tags] : [];
        this.#version = version || "1.0.0";

        Object.freeze(this);
    }

    get id() { return this.#id; }
    get runtimeId() { return this.#runtimeId; }
    get title() { return this.#title; }
    get description() { return this.#description; }
    get difficulty() { return this.#difficulty; }
    get tags() { return [...this.#tags]; }
    get version() { return this.#version; }

    toJSON() {
        return {
            id: this.#id,
            runtimeId: this.#runtimeId,
            title: this.#title,
            description: this.#description,
            difficulty: this.#difficulty,
            tags: [...this.#tags],
            version: this.#version
        };
    }

    static fromJSON(json) {
        return new ScenarioDescriptor(json);
    }

    static validate(obj) {
        if (!obj || typeof obj !== "object") {
            throw new Error("ScenarioDescriptor: input must be an object");
        }
        for (const field of BundleContract.REQUIRED_DESCRIPTOR_FIELDS) {
            if (!obj[field] || typeof obj[field] !== "string") {
                throw new Error(`ScenarioDescriptor: required field "${field}" is missing or invalid`);
            }
        }
        for (const field of BundleContract.FORBIDDEN_DESCRIPTOR_FIELDS) {
            if (field in obj) {
                throw new Error(`ScenarioDescriptor: forbidden field "${field}" must not be present in descriptor`);
            }
        }
    }
}
