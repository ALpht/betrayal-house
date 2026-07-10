import { ScenarioBundle } from "../../package/ScenarioBundle.js";
import { BundleManifest } from "../../package/BundleManifest.js";
import { ScenarioDescriptor } from "../../package/ScenarioDescriptor.js";
import { HAUNT_DEFINITIONS_LIST } from "./HauntContentPack01Definition.js";

const descriptors = HAUNT_DEFINITIONS_LIST.map(def => {
    const meta = def.metadata;
    return new ScenarioDescriptor({
        id: meta.id,
        title: meta.title,
        description: meta.description,
        difficulty: meta.difficulty,
        version: meta.version || "1.0.0",
        tags: ["haunt", "official", meta.id]
    });
});

export const hauntContentPack01Bundle = new ScenarioBundle({
    manifest: new BundleManifest({
        bundleId: "haunt-content-pack-01",
        bundleVersion: "1.0.0",
        engineVersion: ">=4.5",
        schemaVersion: 1,
        title: "Haunt Content Pack 01",
        author: "Betrayal House Team",
        description: "Five official haunt scenarios for Framework Consumer Validation.",
        license: "MIT",
        scenarioCount: descriptors.length
    }),
    descriptors
});
