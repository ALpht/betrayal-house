import { ScenarioDefinition } from "../../../definition/ScenarioDefinition.js";
import { RelicEscapeScenario } from "./RelicEscapeScenario.js";
import { RelicEscapeVictoryCondition } from "./RelicEscapeVictoryCondition.js";

export const relicEscapeDefinition = new ScenarioDefinition({
    metadata: {
        id: "relicEscape",
        title: "Relic Escape",
        description: "Collect three relics and reach the exit before the house seals itself.",
        difficulty: 2,
        version: "1.0.0",
        tags: ["playable", "collection", "escape"]
    },
    objectives: {
        heroes: "Collect all three relics, then move to the exit.",
        traitor: "Delay the heroes until the exit seals after 8 turns."
    },
    traitorRule: "random",
    runtimeClass: RelicEscapeScenario,
    victoryCondition: RelicEscapeVictoryCondition
});
