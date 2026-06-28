import { ScenarioBundle } from "./ScenarioBundle.js";
import { ScenarioDefinitionFactory } from "./ScenarioDefinitionFactory.js";

export class ScenarioLoadError extends Error {
    #scenarioId;
    #reason;

    constructor(scenarioId, reason) {
        super(`Failed to load scenario "${scenarioId}": ${reason}`);
        this.name = "ScenarioLoadError";
        this.#scenarioId = scenarioId;
        this.#reason = reason;
    }

    get scenarioId() { return this.#scenarioId; }
    get reason() { return this.#reason; }
}

export class ScenarioLoader {
    #runtimeRegistry;
    #scenarioRegistry;

    constructor(runtimeRegistry, scenarioRegistry) {
        if (!runtimeRegistry || typeof runtimeRegistry.get !== "function") {
            throw new Error("ScenarioLoader: runtimeRegistry with get() is required");
        }
        if (!scenarioRegistry || typeof scenarioRegistry.register !== "function") {
            throw new Error("ScenarioLoader: scenarioRegistry with register() is required");
        }
        this.#runtimeRegistry = runtimeRegistry;
        this.#scenarioRegistry = scenarioRegistry;
    }

    loadFromBundle(bundle) {
        if (!(bundle instanceof ScenarioBundle)) {
            throw new Error("ScenarioLoader: bundle must be a ScenarioBundle instance");
        }

        const results = [];

        for (const descriptor of bundle.descriptors) {
            try {
                const definition = this.loadFromDescriptor(descriptor);
                results.push({ id: descriptor.id, success: true, definition });
            } catch (e) {
                results.push({ id: descriptor.id, success: false, error: e });
            }
        }

        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
            throw new ScenarioLoadError(
                failures[0].id,
                `Failed to load ${failures.length} scenario(s) (first error: ${failures[0].error.message})`
            );
        }

        return results.map(r => r.definition);
    }

    loadFromDescriptor(descriptor) {
        let runtimeClass;
        try {
            runtimeClass = this.#runtimeRegistry.get(descriptor.runtimeId);
        } catch (e) {
            throw new ScenarioLoadError(
                descriptor.id,
                `runtimeId "${descriptor.runtimeId}" not found in RuntimeRegistry`
            );
        }

        const definition = ScenarioDefinitionFactory.create(descriptor, runtimeClass);

        this.#scenarioRegistry.register(definition);

        return definition;
    }
}
