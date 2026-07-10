import { ScenarioRegistry }
    from "./definition/ScenarioRegistry.js";

import { ScenarioDefinition }
    from "./definition/ScenarioDefinition.js";

import { RuntimeRegistry }
    from "./package/RuntimeRegistry.js";

import { TestScenario }
    from "./scenarios/TestScenario.js";

import { EscapeTheHouseDefinition }
    from "./scenarios/EscapeTheHouseDefinition.js";

import { HAUNT_DEFINITIONS_LIST }
    from "./scenarios/haunts/HauntContentPack01Definition.js";

const registry = new ScenarioRegistry();
const runtimeRegistry = new RuntimeRegistry();

runtimeRegistry.register("testScenario", TestScenario);

registry.register(
    new ScenarioDefinition({

        metadata: {
            id: "testScenario",
            title: "Test Scenario",
            description:
                "A test scenario.",
            difficulty: 1
        },

        objectives: {
            heroes:
                "Complete the test.",
            traitor:
                "Stop the heroes."
        },

        traitorRule: "random",

        runtimeClass:
            TestScenario,

        victoryCondition:
            null
    })
);

const escapeRuntimeClass = EscapeTheHouseDefinition.runtimeClass;
if (escapeRuntimeClass) {
    runtimeRegistry.register("escapeTheHouse", escapeRuntimeClass);
}

registry.register(
    EscapeTheHouseDefinition
);

for (const def of HAUNT_DEFINITIONS_LIST) {
    const rc = def.runtimeClass;
    if (rc) {
        runtimeRegistry.register(def.metadata.id, rc);
    }
    registry.register(def);
}

export { runtimeRegistry };
export default registry;
