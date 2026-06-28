import { ScenarioBundle } from "./ScenarioBundle.js";

export class BundleRegistry {
    #bundles = new Map();

    register(bundle) {
        if (!(bundle instanceof ScenarioBundle)) {
            throw new Error("BundleRegistry: bundle must be a ScenarioBundle instance");
        }

        const id = bundle.manifest.bundleId;
        if (this.#bundles.has(id)) {
            throw new Error(`BundleRegistry: bundle "${id}" is already registered (use unregister first)`);
        }

        this.#bundles.set(id, bundle);
    }

    unregister(bundleId) {
        if (!this.#bundles.has(bundleId)) {
            return false;
        }
        return this.#bundles.delete(bundleId);
    }

    find(bundleId) {
        return this.#bundles.get(bundleId) || null;
    }

    getAll() {
        return [...this.#bundles.values()];
    }

    has(bundleId) {
        return this.#bundles.has(bundleId);
    }

    clear() {
        this.#bundles.clear();
    }
}
