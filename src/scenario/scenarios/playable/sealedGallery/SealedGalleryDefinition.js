import { ScenarioDefinition } from "../../../definition/ScenarioDefinition.js";
import { SealedGalleryScenario } from "./SealedGalleryScenario.js";
import { SealedGalleryVictoryCondition } from "./SealedGalleryVictoryCondition.js";

export const sealedGalleryDefinition = new ScenarioDefinition({
    metadata: {
        id: "sealedGallery",
        title: "The Sealed Gallery",
        description: "Collect symbols and activate the gallery altars in order.",
        difficulty: 3,
        version: "1.0.0",
        tags: ["playable", "puzzle", "activation"]
    },
    objectives: {
        heroes: "Collect three symbols and activate moon, key, and flame in order.",
        traitor: "Force three mistakes or delay the puzzle for 10 turns."
    },
    traitorRule: "random",
    runtimeClass: SealedGalleryScenario,
    victoryCondition: SealedGalleryVictoryCondition
});
