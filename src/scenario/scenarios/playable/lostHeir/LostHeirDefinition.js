import { ScenarioDefinition } from "../../../definition/ScenarioDefinition.js";
import { LostHeirScenario } from "./LostHeirScenario.js";
import { LostHeirVictoryCondition } from "./LostHeirVictoryCondition.js";

export const lostHeirDefinition = new ScenarioDefinition({
    metadata: {
        id: "lostHeir",
        title: "The Lost Heir",
        description: "Escort the heir through the house before the traitor strikes.",
        difficulty: 3,
        version: "1.0.0",
        tags: ["playable", "escort", "traitor"]
    },
    objectives: {
        heroes: "Escort the heir through four safe steps.",
        traitor: "Kill the heir or delay the escort for 8 turns."
    },
    traitorRule: "random",
    runtimeClass: LostHeirScenario,
    victoryCondition: LostHeirVictoryCondition
});
