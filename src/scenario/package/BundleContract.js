export const BundleContract = {
    REQUIRED_MANIFEST_FIELDS: ["bundleId", "bundleVersion", "title"],
    OPTIONAL_MANIFEST_FIELDS: ["author", "description", "license", "engineVersion", "schemaVersion"],
    REQUIRED_DESCRIPTOR_FIELDS: ["id", "title", "version"],
    OPTIONAL_DESCRIPTOR_FIELDS: ["runtimeId", "description", "difficulty", "tags"],
    FORBIDDEN_DESCRIPTOR_FIELDS: [
        "runtimeClass",
        "runtime",
        "runtimeFactory",
        "controller",
        "state",
        "context",
        "router",
        "victoryCondition",
        "traitorRule"
    ],
    SCHEMA_VERSION: 1,
    VALID_VERSION_REGEX: /^\d+\.\d+\.\d+$/,
    VALID_ID_REGEX: /^[a-zA-Z0-9_]+$/
};
