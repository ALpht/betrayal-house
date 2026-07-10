import { ScenarioDefinition }
    from "../definition/ScenarioDefinition.js";

import { EscapeTheHouseScenario }
    from "./EscapeTheHouseScenario.js";

import { EscapeVictoryCondition }
    from "./EscapeVictoryCondition.js";

export const EscapeTheHouseDefinition =
    new ScenarioDefinition({

        metadata: {
            id: "escapeTheHouse",
            title: "Escape The House",
            description:
                "Reach the Entrance Hall to escape!",
            difficulty: 1
        },

        objectives: {
            heroes:
                "Reach the Entrance Hall.",
            traitor:
                "Prevent all heroes from escaping."
        },

        traitorRule: "random",

        runtimeClass:
            EscapeTheHouseScenario,

        victoryCondition:
            EscapeVictoryCondition

    });
