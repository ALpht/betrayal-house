import { ScenarioRuntime }
    from "./runtime/ScenarioRuntime.js";

import { ScenarioState }
    from "./runtime/ScenarioState.js";

export const ScenarioRuntimeFactory = {

    create(definition, context, router) {
        const state = new ScenarioState();
        return new ScenarioRuntime(definition, state, context, router);
    },

    createFromDefinition(definition, context, router) {
        const scenario = definition.createScenario();
        return this.create(scenario, context, router);
    }

};
