import { ScenarioFactoryResult } from "./ScenarioFactoryResult.js";

export class ScenarioFactory {
    #catalog;
    #runtimeFactory;
    #validator;
    #linter;

    constructor({ catalog, runtimeFactory, validator, linter }) {
        this.#catalog = catalog;
        this.#runtimeFactory = runtimeFactory;
        this.#validator = validator;
        this.#linter = linter;
    }

    create(scenarioId, context, router) {
        const definition = this.#catalog.get(scenarioId);
        if (!definition) {
            throw new Error(`Scenario not found: "${scenarioId}"`);
        }

        this.#validator.validate(definition);
        const warnings = this.#linter.lint(definition);

        const scenario = definition.createScenario();
        const runtime = this.#runtimeFactory.create(scenario, context, router);

        return new ScenarioFactoryResult({ runtime, warnings });
    }

    createFromDefinition(definition, context, router) {
        this.#validator.validate(definition);
        const warnings = this.#linter.lint(definition);

        const scenario = definition.createScenario();
        const runtime = this.#runtimeFactory.create(scenario, context, router);

        return new ScenarioFactoryResult({ runtime, warnings });
    }
}
