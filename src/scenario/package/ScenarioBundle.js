import { BundleManifest } from "./BundleManifest.js";
import { ScenarioDescriptor } from "./ScenarioDescriptor.js";

export class ScenarioBundle {
    #manifest;
    #descriptors;

    constructor({ manifest, descriptors }) {
        if (!(manifest instanceof BundleManifest)) {
            throw new Error("ScenarioBundle: manifest must be a BundleManifest instance");
        }
        if (!Array.isArray(descriptors) || descriptors.length === 0) {
            throw new Error("ScenarioBundle: descriptors must be a non-empty array");
        }
        if (!descriptors.every(d => d instanceof ScenarioDescriptor)) {
            throw new Error("ScenarioBundle: all descriptors must be ScenarioDescriptor instances");
        }
        this.#manifest = manifest;
        this.#descriptors = [...descriptors];
    }

    get manifest() { return this.#manifest; }
    get descriptors() { return [...this.#descriptors]; }
    get scenarioCount() { return this.#descriptors.length; }

    getDescriptor(id) {
        return this.#descriptors.find(d => d.id === id) || null;
    }

    hasDescriptor(id) {
        return this.#descriptors.some(d => d.id === id);
    }

    toJSON() {
        return {
            manifest: this.#manifest.toJSON(),
            descriptors: this.#descriptors.map(d => d.toJSON())
        };
    }

    static fromJSON(json) {
        const manifest = BundleManifest.fromJSON(json.manifest);
        const descriptors = json.descriptors.map(d => ScenarioDescriptor.fromJSON(d));
        return new ScenarioBundle({ manifest, descriptors });
    }
}
