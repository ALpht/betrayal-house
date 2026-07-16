import { ScenarioDefinition } from "../../../definition/ScenarioDefinition.js";
import { MaskedHostScenario } from "./MaskedHostScenario.js";
import { MaskedHostVictoryCondition } from "./MaskedHostVictoryCondition.js";

export const maskedHostDefinition = new ScenarioDefinition({
    metadata: {
        id: "maskedHost",
        title: "The Masked Host",
        description: "Find clues, reveal the traitor, and destroy the cursed masks.",
        difficulty: 4,
        version: "1.0.0",
        tags: ["playable", "hidden-information", "traitor"]
    },
    objectives: {
        heroes: "Find three clues, reveal the traitor, then destroy two cursed masks.",
        traitor: "Stay hidden until the masquerade ends after 9 turns."
    },
    traitorRule: "random",
    runtimeClass: MaskedHostScenario,
    victoryCondition: MaskedHostVictoryCondition
});
