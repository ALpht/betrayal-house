import { ScenarioRegistry }
    from "./definition/ScenarioRegistry.js";

import { ScenarioDefinition }
    from "./definition/ScenarioDefinition.js";

import { TestScenario }
    from "./scenarios/TestScenario.js";

import { EscapeTheHouseDefinition }
    from "./scenarios/EscapeTheHouseDefinition.js";

const registry = new ScenarioRegistry();

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

registry.register(
    EscapeTheHouseDefinition
);

export default registry;
