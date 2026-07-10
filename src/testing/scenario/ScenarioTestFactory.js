import { ScenarioRuntimeFactory }
    from "../../scenario/ScenarioRuntimeFactory.js";

import { ScenarioTestContext }
    from "./ScenarioTestContext.js";

import HauntScenarioRegistry
    from "../../scenario/HauntScenarioRegistry.js";

export class ScenarioTestFactory {
    static createFromDefinition(
        definition,
        contextOverrides = {}
    ) {
        const scenario =
            definition.createScenario();

        const context =
            ScenarioTestContext.create(
                contextOverrides
            );

        return ScenarioRuntimeFactory.create(
            scenario,
            context
        );
    }

    static create(
        scenarioId,
        contextOverrides = {}
    ) {
        const definition =
            HauntScenarioRegistry
                .get(scenarioId);

        if (!definition) {
            throw new Error(
                `Scenario not found: "${scenarioId}"`
            );
        }

        return ScenarioTestFactory
            .createFromDefinition(
                definition,
                contextOverrides
            );
    }
}
