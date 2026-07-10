import { BundleContract } from "./BundleContract.js";

export class BundleManifest {
    #bundleId;
    #bundleVersion;
    #engineVersion;
    #schemaVersion;
    #title;
    #author;
    #description;
    #license;
    #scenarioCount;

    constructor({ bundleId, bundleVersion, engineVersion, schemaVersion, title, author, description, license, scenarioCount }) {
        if (!bundleId || typeof bundleId !== "string") {
            throw new Error("BundleManifest: bundleId is required and must be a string");
        }
        if (!bundleVersion || typeof bundleVersion !== "string") {
            throw new Error("BundleManifest: bundleVersion is required and must be a string");
        }
        if (!title || typeof title !== "string") {
            throw new Error("BundleManifest: title is required and must be a string");
        }
        this.#bundleId = bundleId;
        this.#bundleVersion = bundleVersion;
        this.#engineVersion = engineVersion || ">=4.5";
        this.#schemaVersion = typeof schemaVersion === "number" ? schemaVersion : BundleContract.SCHEMA_VERSION;
        this.#title = title;
        this.#author = author || "";
        this.#description = description || "";
        this.#license = license || "";
        this.#scenarioCount = typeof scenarioCount === "number" ? scenarioCount : 0;
    }

    get bundleId() { return this.#bundleId; }
    get bundleVersion() { return this.#bundleVersion; }
    get engineVersion() { return this.#engineVersion; }
    get schemaVersion() { return this.#schemaVersion; }
    get title() { return this.#title; }
    get author() { return this.#author; }
    get description() { return this.#description; }
    get license() { return this.#license; }
    get scenarioCount() { return this.#scenarioCount; }

    toJSON() {
        return {
            bundleId: this.#bundleId,
            bundleVersion: this.#bundleVersion,
            engineVersion: this.#engineVersion,
            schemaVersion: this.#schemaVersion,
            title: this.#title,
            author: this.#author,
            description: this.#description,
            license: this.#license,
            scenarioCount: this.#scenarioCount
        };
    }

    static fromJSON(json) {
        return new BundleManifest(json);
    }
}
