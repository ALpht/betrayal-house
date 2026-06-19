import { ScenarioRuntime }
    from "./runtime/ScenarioRuntime.js";

import { ScenarioState }
    from "./runtime/ScenarioState.js";

export const ScenarioRuntimeFactory = {

    create(definition, context) {
        const state = new ScenarioState();
        return new ScenarioRuntime(definition, state, context);
    }

};
