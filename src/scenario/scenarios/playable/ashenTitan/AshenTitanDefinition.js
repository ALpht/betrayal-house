import { ScenarioDefinition } from "../../../definition/ScenarioDefinition.js";
import { AshenTitanScenario } from "./AshenTitanScenario.js";
import { AshenTitanVictoryCondition } from "./AshenTitanVictoryCondition.js";

export const ashenTitanDefinition = new ScenarioDefinition({
    metadata: {
        id: "ashenTitan",
        title: "The Ashen Titan",
        description: "Break the Titan's anchors, then bring the monster down.",
        difficulty: 4,
        version: "1.0.0",
        tags: ["playable", "boss", "destroy"]
    },
    objectives: {
        heroes: "Destroy both anchors and reduce the Titan to 0 HP.",
        traitor: "Keep the Titan alive for 10 turns."
    },
    traitorRule: "random",
    runtimeClass: AshenTitanScenario,
    victoryCondition: AshenTitanVictoryCondition
});
