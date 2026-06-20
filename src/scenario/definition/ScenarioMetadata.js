export class ScenarioMetadata {
    #id;
    #title;
    #description;
    #difficulty;

    constructor({ id, title, description, difficulty }) {
        this.#id = id;
        this.#title = title;
        this.#description = description;
        this.#difficulty = difficulty;
    }

    get id() { return this.#id; }
    get title() { return this.#title; }
    get description() { return this.#description; }
    get difficulty() { return this.#difficulty; }

    toJSON() {
        return {
            id: this.#id,
            title: this.#title,
            description: this.#description,
            difficulty: this.#difficulty
        };
    }

    static fromJSON(json) {
        return new ScenarioMetadata(json);
    }
}
