import { ScenarioDefinition } from "../definition/ScenarioDefinition.js";
import { BuilderError } from "./BuilderError.js";

function toId(title) {
    return title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_ ]/g, "")
        .trim()
        .replace(/\s+/g, "_");
}

export class ScenarioBuilder {
    #metadata = {};
    #objectives = null;
    #traitorRule = null;
    #runtimeClass = null;
    #victoryCondition = null;

    setId(v) {
        this.#metadata.id = v;
        return this;
    }

    setTitle(v) {
        this.#metadata.title = v;
        return this;
    }

    setDescription(v) {
        this.#metadata.description = v;
        return this;
    }

    setDifficulty(v) {
        this.#metadata.difficulty = v;
        return this;
    }

    setVersion(v) {
        this.#metadata.version = v;
        return this;
    }

    setObjectives({ heroes, traitor }) {
        this.#objectives = { heroes, traitor };
        return this;
    }

    setTraitorRule(v) {
        this.#traitorRule = v;
        return this;
    }

    setRuntimeClass(v) {
        this.#runtimeClass = v;
        return this;
    }

    setVictoryCondition(v) {
        this.#victoryCondition = v;
        return this;
    }

    setMetadata(key, value) {
        this.#metadata[key] = value;
        return this;
    }

    build() {
        const title = this.#metadata.title;
        if (!title || typeof title !== "string") {
            throw new BuilderError({
                field: "title",
                message: "title is required and must be a non-empty string"
            });
        }

        if (!this.#metadata.id) {
            this.#metadata.id = toId(title);
        }

        const description = this.#metadata.description;
        if (!description || typeof description !== "string") {
            throw new BuilderError({
                field: "description",
                message: "description is required and must be a non-empty string"
            });
        }

        if (!this.#objectives || !this.#objectives.heroes || !this.#objectives.traitor) {
            throw new BuilderError({
                field: "objectives",
                message: "objectives with heroes and traitor text is required"
            });
        }

        if (!this.#traitorRule) {
            throw new BuilderError({
                field: "traitorRule",
                message: "traitorRule is required"
            });
        }

        if (!this.#runtimeClass) {
            throw new BuilderError({
                field: "runtimeClass",
                message: "runtimeClass is required"
            });
        }

        return new ScenarioDefinition({
            metadata: { ...this.#metadata },
            objectives: { ...this.#objectives },
            traitorRule: this.#traitorRule,
            runtimeClass: this.#runtimeClass,
            victoryCondition: this.#victoryCondition
        });
    }
}
