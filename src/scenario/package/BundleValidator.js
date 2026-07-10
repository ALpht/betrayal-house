import { BundleContract } from "./BundleContract.js";

export class BundleValidationError extends Error {
    #code;
    #details;

    constructor({ code, message, details }) {
        super(message);
        this.name = "BundleValidationError";
        this.#code = code;
        this.#details = details || [];
    }

    get code() { return this.#code; }
    get details() { return [...this.#details]; }

    toJSON() {
        return {
            code: this.#code,
            message: this.message,
            details: [...this.#details]
        };
    }
}

export class BundleValidator {

    validate(bundle) {
        const errors = [];

        if (!bundle || typeof bundle !== "object") {
            throw new BundleValidationError({
                code: "INVALID_BUNDLE",
                message: "Bundle must be an object"
            });
        }

        try {
            this.validateManifest(bundle.manifest);
        } catch (e) {
            if (e instanceof BundleValidationError) {
                errors.push(...e.details);
            } else {
                throw e;
            }
        }

        try {
            this.validateDescriptors(bundle.descriptors || []);
        } catch (e) {
            if (e instanceof BundleValidationError) {
                errors.push(...e.details);
            } else {
                throw e;
            }
        }

        if (bundle.manifest && bundle.descriptors) {
            if (bundle.manifest.scenarioCount !== bundle.descriptors.length) {
                errors.push({
                    code: "SCENARIO_COUNT_MISMATCH",
                    path: "manifest.scenarioCount",
                    message: `manifest.scenarioCount (${bundle.manifest.scenarioCount}) does not match descriptors.length (${bundle.descriptors.length})`
                });
            }
        }

        if (errors.length > 0) {
            throw new BundleValidationError({
                code: "VALIDATION_FAILED",
                message: `Bundle validation failed with ${errors.length} error(s)`,
                details: errors
            });
        }
    }

    validateManifest(manifest) {
        const errors = [];

        if (!manifest || typeof manifest !== "object") {
            errors.push({
                code: "MISSING_MANIFEST",
                path: "manifest",
                message: "Bundle must have a manifest object"
            });
            throw new BundleValidationError({
                code: "INVALID_MANIFEST",
                message: "Manifest is missing or invalid",
                details: errors
            });
        }

        for (const field of BundleContract.REQUIRED_MANIFEST_FIELDS) {
            if (!manifest[field] || typeof manifest[field] !== "string") {
                errors.push({
                    code: "MISSING_REQUIRED_FIELD",
                    path: `manifest.${field}`,
                    message: `Required manifest field "${field}" is missing or invalid`
                });
            }
        }

        if (manifest.bundleVersion && !BundleContract.VALID_VERSION_REGEX.test(manifest.bundleVersion)) {
            errors.push({
                code: "INVALID_VERSION_FORMAT",
                path: "manifest.bundleVersion",
                message: `bundleVersion "${manifest.bundleVersion}" must match semver format (e.g. 1.0.0)`
            });
        }

        if (manifest.schemaVersion !== undefined && typeof manifest.schemaVersion !== "number") {
            errors.push({
                code: "INVALID_SCHEMA_VERSION",
                path: "manifest.schemaVersion",
                message: "schemaVersion must be a number"
            });
        }

        if (errors.length > 0) {
            throw new BundleValidationError({
                code: "INVALID_MANIFEST",
                message: `Manifest validation failed with ${errors.length} error(s)`,
                details: errors
            });
        }
    }

    validateDescriptors(descriptors) {
        const errors = [];
        const seenIds = new Set();

        for (let i = 0; i < descriptors.length; i++) {
            const desc = descriptors[i];

            if (!desc || typeof desc !== "object") {
                errors.push({
                    code: "INVALID_DESCRIPTOR",
                    path: `descriptors[${i}]`,
                    message: `Descriptor at index ${i} must be an object`
                });
                continue;
            }

            for (const field of BundleContract.REQUIRED_DESCRIPTOR_FIELDS) {
                if (!desc[field] || typeof desc[field] !== "string") {
                    errors.push({
                        code: "MISSING_DESCRIPTOR_FIELD",
                        path: `descriptors[${i}].${field}`,
                        message: `Required descriptor field "${field}" is missing or invalid at index ${i}`
                    });
                }
            }

            for (const field of BundleContract.FORBIDDEN_DESCRIPTOR_FIELDS) {
                if (field in desc) {
                    errors.push({
                        code: "FORBIDDEN_DESCRIPTOR_FIELD",
                        path: `descriptors[${i}].${field}`,
                        message: `Forbidden descriptor field "${field}" present at index ${i}`
                    });
                }
            }

            if (desc.id && typeof desc.id === "string") {
                if (seenIds.has(desc.id)) {
                    errors.push({
                        code: "DUPLICATE_SCENARIO_ID",
                        path: `descriptors[${i}].id`,
                        message: `Duplicate scenario ID "${desc.id}" within bundle at index ${i}`
                    });
                }
                seenIds.add(desc.id);
            }
        }

        if (errors.length > 0) {
            throw new BundleValidationError({
                code: "INVALID_DESCRIPTORS",
                message: `Descriptor validation failed with ${errors.length} error(s)`,
                details: errors
            });
        }
    }

    validateBundles(bundles) {
        const allErrors = [];
        const globalIds = new Map();

        for (let i = 0; i < bundles.length; i++) {
            const bundle = bundles[i];
            try {
                this.validate(bundle);
            } catch (e) {
                if (e instanceof BundleValidationError) {
                    allErrors.push(...e.details.map(d => ({ ...d, bundleIndex: i })));
                } else {
                    throw e;
                }
            }

            const descriptors = bundle.descriptors || [];
            for (const desc of descriptors) {
                if (desc.id && typeof desc.id === "string") {
                    if (globalIds.has(desc.id)) {
                        allErrors.push({
                            code: "GLOBAL_DUPLICATE_SCENARIO_ID",
                            path: `bundle[${i}].descriptor.id`,
                            message: `Scenario ID "${desc.id}" is duplicated across bundles (also in bundle index ${globalIds.get(desc.id)})`,
                            bundleIndex: i,
                            scenarioId: desc.id,
                            previousBundleIndex: globalIds.get(desc.id)
                        });
                    }
                    globalIds.set(desc.id, i);
                }
            }
        }

        if (allErrors.length > 0) {
            throw new BundleValidationError({
                code: "CROSS_BUNDLE_VALIDATION_FAILED",
                message: `Cross-bundle validation failed with ${allErrors.length} error(s)`,
                details: allErrors
            });
        }
    }
}
