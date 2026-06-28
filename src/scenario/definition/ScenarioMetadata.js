export class ScenarioMetadata {
    #id;
    #title;
    #description;
    #difficulty;
    #version;
    #tags;

    constructor({ id, title, description, difficulty, version, tags }) {
        this.#id = id;
        this.#title = title;
        this.#description = description || "";
        this.#difficulty = typeof difficulty === "number" ? difficulty : 1;
        this.#version = version || "";
        this.#tags = Array.isArray(tags) ? [...tags] : [];
    }

    get id() { return this.#id; }
    get title() { return this.#title; }
    get description() { return this.#description; }
    get difficulty() { return this.#difficulty; }
    get version() { return this.#version; }
    get tags() { return [...this.#tags]; }

    toJSON() {
        return {
            id: this.#id,
            title: this.#title,
            description: this.#description,
            difficulty: this.#difficulty,
            version: this.#version,
            tags: [...this.#tags]
        };
    }

    static fromJSON(json) {
        return new ScenarioMetadata(json);
    }
}
