import { ScenarioMetadata } from "./ScenarioMetadata.js";
import { ScenarioObjectives } from "./ScenarioObjectives.js";

export class ScenarioDefinition {
    #metadata;
    #objectives;
    #traitorRule;
    #runtimeClass;
    #victoryCondition;

    constructor({ metadata, objectives, traitorRule, runtimeClass, victoryCondition }) {
        this.#metadata = metadata instanceof ScenarioMetadata
            ? metadata
            : new ScenarioMetadata(metadata || {});

        this.#objectives = objectives instanceof ScenarioObjectives
            ? objectives
            : new ScenarioObjectives(objectives || {});

        this.#traitorRule = traitorRule;
        this.#runtimeClass = runtimeClass;
        this.#victoryCondition = victoryCondition;
    }

    get metadata() { return this.#metadata; }
    get objectives() { return this.#objectives; }
    get traitorRule() { return this.#traitorRule; }
    get runtimeClass() { return this.#runtimeClass; }
    get victoryCondition() { return this.#victoryCondition; }

    createScenario() {
        const scenario = new this.#runtimeClass();
        if (this.#victoryCondition) {
            scenario.setVictoryCondition(new this.#victoryCondition());
        }
        return scenario;
    }
}
