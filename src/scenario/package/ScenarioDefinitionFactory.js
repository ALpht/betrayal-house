import { ScenarioDefinition } from "../definition/ScenarioDefinition.js";
import { ScenarioMetadata } from "../definition/ScenarioMetadata.js";
import { ScenarioDescriptor } from "./ScenarioDescriptor.js";

export class ScenarioDefinitionFactory {

    static create(descriptor, runtimeClass, { traitorRule, victoryCondition, objectives } = {}) {
        if (!(descriptor instanceof ScenarioDescriptor)) {
            throw new Error("ScenarioDefinitionFactory: descriptor must be a ScenarioDescriptor instance");
        }

        if (!runtimeClass || typeof runtimeClass !== "function") {
            throw new Error("ScenarioDefinitionFactory: runtimeClass must be a class");
        }

        const metadata = new ScenarioMetadata({
            id: descriptor.id,
            title: descriptor.title,
            description: descriptor.description,
            difficulty: descriptor.difficulty,
            version: descriptor.version,
            tags: descriptor.tags
        });

        return new ScenarioDefinition({
            metadata,
            objectives: objectives || { heroes: "", traitor: "" },
            traitorRule: traitorRule || "random",
            runtimeClass,
            victoryCondition: victoryCondition || null
        });
    }
}
