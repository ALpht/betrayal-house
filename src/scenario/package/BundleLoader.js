import { ScenarioBundle } from "./ScenarioBundle.js";
import { BundleManifest } from "./BundleManifest.js";
import { ScenarioDescriptor } from "./ScenarioDescriptor.js";

export class BundleLoader {

    loadFromJSON(jsonString) {
        if (typeof jsonString !== "string") {
            throw new Error("BundleLoader: input must be a JSON string");
        }

        let obj;
        try {
            obj = JSON.parse(jsonString);
        } catch (e) {
            throw new Error(`BundleLoader: invalid JSON — ${e.message}`);
        }

        return this.loadFromObject(obj);
    }

    loadFromObject(obj) {
        if (!obj || typeof obj !== "object") {
            throw new Error("BundleLoader: input must be a plain object");
        }

        const manifest = new BundleManifest(obj.manifest || obj);

        const descriptors = (obj.descriptors || []).map(d => {
            ScenarioDescriptor.validate(d);
            return new ScenarioDescriptor(d);
        });

        return new ScenarioBundle({
            manifest,
            descriptors
        });
    }
}
