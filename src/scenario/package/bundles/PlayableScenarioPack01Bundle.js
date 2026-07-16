import { ScenarioBundle } from "../ScenarioBundle.js";
import { BundleManifest } from "../BundleManifest.js";
import { ScenarioDescriptor } from "../ScenarioDescriptor.js";
import { PLAYABLE_SCENARIO_PACK_01_DEFINITIONS_LIST } from "../../scenarios/playable/PlayableScenarioPack01Definition.js";

const descriptors = PLAYABLE_SCENARIO_PACK_01_DEFINITIONS_LIST.map(def => {
    const meta = def.metadata;
    return new ScenarioDescriptor({
        id: meta.id,
        title: meta.title,
        description: meta.description,
        difficulty: meta.difficulty,
        version: meta.version || "1.0.0",
        tags: meta.tags
    });
});

export const playableScenarioPack01Bundle = new ScenarioBundle({
    manifest: new BundleManifest({
        bundleId: "playable-scenario-pack-01",
        bundleVersion: "1.0.0",
        engineVersion: ">=4.5",
        schemaVersion: 1,
        title: "Playable Scenario Pack 01",
        author: "Betrayal House Team",
        description: "Five playable scenarios focused on game variety without framework changes.",
        license: "MIT",
        scenarioCount: descriptors.length
    }),
    descriptors
});
