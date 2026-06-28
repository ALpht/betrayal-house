import { HauntScenario } from "../scenario/HauntScenario.js";
import { ScenarioDescriptor } from "../scenario/package/ScenarioDescriptor.js";
import { BundleManifest } from "../scenario/package/BundleManifest.js";
import { ScenarioBundle } from "../scenario/package/ScenarioBundle.js";
import { BundleValidator, BundleValidationError } from "../scenario/package/BundleValidator.js";
import { BundleLoader } from "../scenario/package/BundleLoader.js";
import { BundleRegistry } from "../scenario/package/BundleRegistry.js";
import { RuntimeRegistry, RuntimeNotFoundError } from "../scenario/package/RuntimeRegistry.js";
import { ScenarioDefinitionFactory } from "../scenario/package/ScenarioDefinitionFactory.js";
import { ScenarioLoader, ScenarioLoadError } from "../scenario/package/ScenarioLoader.js";
import { ScenarioRegistry } from "../scenario/definition/ScenarioRegistry.js";
import { BundleContract } from "../scenario/package/BundleContract.js";

class TestHauntScenario extends HauntScenario {
    static meta = { id: "test_haunt", traitorRule: "random" };
    start(ctx, state) {
        state.set("started", true);
    }
}

class AnotherScenario extends HauntScenario {
    static meta = { id: "another", traitorRule: "random" };
    start(ctx, state) {
        state.set("another", true);
    }
}

class NonHauntClass {
    constructor() {}
}

const VALID_DESCRIPTOR_OBJ = {
    id: "haunt_01",
    title: "Haunt 01",
    description: "First haunt.",
    difficulty: 3,
    tags: ["combat", "exploration"],
    version: "1.0.0"
};

const VALID_MANIFEST_OBJ = {
    bundleId: "test-bundle",
    bundleVersion: "1.0.0",
    engineVersion: ">=4.5",
    schemaVersion: 1,
    title: "Test Bundle",
    author: "Test Author",
    description: "A test bundle.",
    license: "MIT",
    scenarioCount: 1
};

export function runScenarioBundleTest() {
    console.log("===== Scenario Bundle Test =====");

    /* =========================
     * ScenarioDescriptor Tests
     * ========================= */

    /* [CASE 1] ScenarioDescriptor construction with all fields */
    try {
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const ok = desc.id === "haunt_01"
            && desc.runtimeId === "haunt_01"
            && desc.title === "Haunt 01"
            && desc.description === "First haunt."
            && desc.difficulty === 3
            && desc.tags.length === 2
            && desc.version === "1.0.0";
        console.log("[CASE 1] ScenarioDescriptor construction:", ok);
    } catch (e) {
        console.log("[CASE 1] ScenarioDescriptor construction:", false, e.message);
    }

    /* [CASE 2] ScenarioDescriptor runtimeId defaults to id */
    try {
        const desc = new ScenarioDescriptor({ id: "test", title: "Test", version: "1.0.0" });
        console.log("[CASE 2] runtimeId defaults to id:", desc.runtimeId === "test");
    } catch (e) {
        console.log("[CASE 2] runtimeId defaults to id:", false, e.message);
    }

    /* [CASE 3] ScenarioDescriptor rejects missing required fields */
    try {
        const desc = new ScenarioDescriptor({});
        console.log("[CASE 3] Rejects missing required fields:", false);
    } catch (e) {
        console.log("[CASE 3] Rejects missing required fields:", true);
    }

    /* [CASE 4] ScenarioDescriptor is immutable */
    try {
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        desc.id = "changed";
        console.log("[CASE 4] Immutable (non-strict):", desc.id === "haunt_01");
    } catch (e) {
        console.log("[CASE 4] Immutable (strict mode):", true);
    }

    /* [CASE 5] ScenarioDescriptor serialization round-trip */
    try {
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const json = desc.toJSON();
        const restored = ScenarioDescriptor.fromJSON(json);
        const ok = restored.id === desc.id
            && restored.title === desc.title
            && restored.difficulty === desc.difficulty
            && restored.version === desc.version;
        console.log("[CASE 5] Serialization round-trip:", ok);
    } catch (e) {
        console.log("[CASE 5] Serialization round-trip:", false, e.message);
    }

    /* [CASE 6] ScenarioDescriptor.validate rejects forbidden fields */
    try {
        ScenarioDescriptor.validate({ id: "test", title: "Test", version: "1.0.0", runtimeClass: "something" });
        console.log("[CASE 6] Validate rejects forbidden fields:", false);
    } catch (e) {
        console.log("[CASE 6] Validate rejects forbidden fields:", true);
    }

    /* [CASE 7] BundleContract.FORBIDDEN_DESCRIPTOR_FIELDS covers all runtime fields */
    try {
        const forbidden = BundleContract.FORBIDDEN_DESCRIPTOR_FIELDS;
        const coversAll = forbidden.includes("runtimeClass")
            && forbidden.includes("controller")
            && forbidden.includes("victoryCondition")
            && forbidden.includes("traitorRule")
            && forbidden.includes("router");
        console.log("[CASE 7] FORBIDDEN_DESCRIPTOR_FIELDS coverage:", coversAll);
    } catch (e) {
        console.log("[CASE 7] FORBIDDEN_DESCRIPTOR_FIELDS coverage:", false, e.message);
    }

    /* =========================
     * BundleManifest Tests
     * ========================= */

    /* [CASE 8] BundleManifest construction with all fields */
    try {
        const m = new BundleManifest(VALID_MANIFEST_OBJ);
        const ok = m.bundleId === "test-bundle"
            && m.bundleVersion === "1.0.0"
            && m.engineVersion === ">=4.5"
            && m.schemaVersion === 1
            && m.title === "Test Bundle"
            && m.author === "Test Author";
        console.log("[CASE 8] BundleManifest construction:", ok);
    } catch (e) {
        console.log("[CASE 8] BundleManifest construction:", false, e.message);
    }

    /* [CASE 9] BundleManifest defaults engineVersion and schemaVersion */
    try {
        const m = new BundleManifest({ bundleId: "test", bundleVersion: "1.0.0", title: "Test" });
        const ok = m.engineVersion === ">=4.5"
            && m.schemaVersion === BundleContract.SCHEMA_VERSION;
        console.log("[CASE 9] BundleManifest defaults:", ok);
    } catch (e) {
        console.log("[CASE 9] BundleManifest defaults:", false, e.message);
    }

    /* [CASE 10] BundleManifest serialization round-trip */
    try {
        const m = new BundleManifest(VALID_MANIFEST_OBJ);
        const json = m.toJSON();
        const restored = BundleManifest.fromJSON(json);
        const ok = restored.bundleId === m.bundleId
            && restored.bundleVersion === m.bundleVersion
            && restored.schemaVersion === m.schemaVersion;
        console.log("[CASE 10] Manifest serialization round-trip:", ok);
    } catch (e) {
        console.log("[CASE 10] Manifest serialization round-trip:", false, e.message);
    }

    /* =========================
     * ScenarioBundle Tests
     * ========================= */

    /* [CASE 11] ScenarioBundle construction */
    try {
        const manifest = new BundleManifest(VALID_MANIFEST_OBJ);
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const bundle = new ScenarioBundle({ manifest, descriptors: [desc] });
        const ok = bundle.manifest.bundleId === "test-bundle"
            && bundle.descriptors.length === 1
            && bundle.scenarioCount === 1
            && bundle.getDescriptor("haunt_01") === desc
            && bundle.hasDescriptor("haunt_01") === true;
        console.log("[CASE 11] ScenarioBundle construction:", ok);
    } catch (e) {
        console.log("[CASE 11] ScenarioBundle construction:", false, e.message);
    }

    /* [CASE 12] ScenarioBundle rejects empty descriptors */
    try {
        const manifest = new BundleManifest(VALID_MANIFEST_OBJ);
        const bundle = new ScenarioBundle({ manifest, descriptors: [] });
        console.log("[CASE 12] Rejects empty descriptors:", false);
    } catch (e) {
        console.log("[CASE 12] Rejects empty descriptors:", true);
    }

    /* [CASE 13] ScenarioBundle serialization round-trip */
    try {
        const manifest = new BundleManifest(VALID_MANIFEST_OBJ);
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const bundle = new ScenarioBundle({ manifest, descriptors: [desc] });
        const json = bundle.toJSON();
        const restored = ScenarioBundle.fromJSON(json);
        const ok = restored.manifest.bundleId === "test-bundle"
            && restored.descriptors.length === 1
            && restored.getDescriptor("haunt_01") !== null;
        console.log("[CASE 13] Bundle serialization round-trip:", ok);
    } catch (e) {
        console.log("[CASE 13] Bundle serialization round-trip:", false, e.message);
    }

    /* =========================
     * BundleValidator Tests
     * ========================= */

    /* [CASE 14] BundleValidator passes on valid bundle */
    try {
        const validator = new BundleValidator();
        const manifest = new BundleManifest(VALID_MANIFEST_OBJ);
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const bundle = new ScenarioBundle({ manifest, descriptors: [desc] });
        validator.validate(bundle);
        console.log("[CASE 14] Valid bundle passes:", true);
    } catch (e) {
        console.log("[CASE 14] Valid bundle passes:", false, e.message);
    }

    /* [CASE 15] BundleValidator rejects missing manifest fields */
    try {
        const validator = new BundleValidator();
        validator.validateManifest({});
        console.log("[CASE 15] Rejects missing manifest fields:", false);
    } catch (e) {
        const isValidationError = e instanceof BundleValidationError;
        const hasMissingFields = e.details.some(d => d.code === "MISSING_REQUIRED_FIELD");
        console.log("[CASE 15] Rejects missing manifest fields:", isValidationError && hasMissingFields);
    }

    /* [CASE 16] BundleValidator rejects duplicate scenario IDs within bundle */
    try {
        const validator = new BundleValidator();
        const obj = { id: "dup", title: "Dup", version: "1.0.0" };
        validator.validateDescriptors([obj, obj]);
        console.log("[CASE 16] Rejects intra-bundle duplicate IDs:", false);
    } catch (e) {
        const isValError = e instanceof BundleValidationError;
        const hasDup = e.details.some(d => d.code === "DUPLICATE_SCENARIO_ID");
        console.log("[CASE 16] Rejects intra-bundle duplicate IDs:", isValError && hasDup);
    }

    /* [CASE 17] BundleValidator rejects forbidden descriptor fields */
    try {
        const validator = new BundleValidator();
        validator.validateDescriptors([{ id: "test", title: "Test", version: "1.0.0", runtimeClass: "anything" }]);
        console.log("[CASE 17] Rejects forbidden descriptor fields:", false);
    } catch (e) {
        const hasForbidden = e.details.some(d => d.code === "FORBIDDEN_DESCRIPTOR_FIELD");
        console.log("[CASE 17] Rejects forbidden descriptor fields:", hasForbidden);
    }

    /* [CASE 18] BundleValidator rejects scenarioCount mismatch */
    try {
        const validator = new BundleValidator();
        const manifest = new BundleManifest({ ...VALID_MANIFEST_OBJ, scenarioCount: 99 });
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const bundle = new ScenarioBundle({ manifest, descriptors: [desc] });
        validator.validate(bundle);
        console.log("[CASE 18] Rejects scenarioCount mismatch:", false);
    } catch (e) {
        const hasMismatch = e.details.some(d => d.code === "SCENARIO_COUNT_MISMATCH");
        console.log("[CASE 18] Rejects scenarioCount mismatch:", hasMismatch);
    }

    /* [CASE 19] BundleValidator cross-bundle duplicate IDs */
    try {
        const validator = new BundleValidator();
        const mf1 = new BundleManifest({ bundleId: "bundle-a", bundleVersion: "1.0.0", title: "A", scenarioCount: 1 });
        const mf2 = new BundleManifest({ bundleId: "bundle-b", bundleVersion: "1.0.0", title: "B", scenarioCount: 1 });
        const desc = new ScenarioDescriptor({ id: "shared_id", title: "Shared", version: "1.0.0" });
        const bundle1 = new ScenarioBundle({ manifest: mf1, descriptors: [desc] });
        const bundle2 = new ScenarioBundle({ manifest: mf2, descriptors: [desc] });
        validator.validateBundles([bundle1, bundle2]);
        console.log("[CASE 19] Rejects cross-bundle duplicate IDs:", false);
    } catch (e) {
        const hasGlobal = e.details.some(d => d.code === "GLOBAL_DUPLICATE_SCENARIO_ID");
        console.log("[CASE 19] Rejects cross-bundle duplicate IDs:", hasGlobal);
    }

    /* [CASE 20] BundleValidator rejects invalid version format */
    try {
        const validator = new BundleValidator();
        validator.validateManifest({ bundleId: "test", bundleVersion: "abc", title: "Test" });
        console.log("[CASE 20] Rejects invalid version format:", false);
    } catch (e) {
        const hasVersionError = e.details.some(d => d.code === "INVALID_VERSION_FORMAT");
        console.log("[CASE 20] Rejects invalid version format:", hasVersionError);
    }

    /* =========================
     * BundleLoader Tests
     * ========================= */

    /* [CASE 21] BundleLoader.loadFromObject creates valid bundle */
    try {
        const loader = new BundleLoader();
        const bundle = loader.loadFromObject({
            manifest: VALID_MANIFEST_OBJ,
            descriptors: [VALID_DESCRIPTOR_OBJ]
        });
        const ok = bundle instanceof ScenarioBundle
            && bundle.descriptors.length === 1
            && bundle.manifest.bundleId === "test-bundle";
        console.log("[CASE 21] BundleLoader.loadFromObject:", ok);
    } catch (e) {
        console.log("[CASE 21] BundleLoader.loadFromObject:", false, e.message);
    }

    /* [CASE 22] BundleLoader.loadFromJSON round-trip */
    try {
        const loader = new BundleLoader();
        const json = JSON.stringify({
            manifest: VALID_MANIFEST_OBJ,
            descriptors: [VALID_DESCRIPTOR_OBJ]
        });
        const bundle = loader.loadFromJSON(json);
        const ok = bundle instanceof ScenarioBundle && bundle.descriptors.length === 1;
        console.log("[CASE 22] BundleLoader.loadFromJSON:", ok);
    } catch (e) {
        console.log("[CASE 22] BundleLoader.loadFromJSON:", false, e.message);
    }

    /* [CASE 23] BundleLoader rejects invalid JSON */
    try {
        const loader = new BundleLoader();
        loader.loadFromJSON("{invalid");
        console.log("[CASE 23] Rejects invalid JSON:", false);
    } catch (e) {
        console.log("[CASE 23] Rejects invalid JSON:", true);
    }

    /* =========================
     * BundleRegistry Tests
     * ========================= */

    /* [CASE 24] BundleRegistry register and find */
    try {
        const registry = new BundleRegistry();
        const manifest = new BundleManifest(VALID_MANIFEST_OBJ);
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const bundle = new ScenarioBundle({ manifest, descriptors: [desc] });
        registry.register(bundle);
        const ok = registry.has("test-bundle")
            && registry.find("test-bundle") === bundle;
        console.log("[CASE 24] BundleRegistry register/find:", ok);
    } catch (e) {
        console.log("[CASE 24] BundleRegistry register/find:", false, e.message);
    }

    /* [CASE 25] BundleRegistry rejects duplicate */
    try {
        const registry = new BundleRegistry();
        const manifest = new BundleManifest(VALID_MANIFEST_OBJ);
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const bundle = new ScenarioBundle({ manifest, descriptors: [desc] });
        registry.register(bundle);
        registry.register(bundle);
        console.log("[CASE 25] Rejects duplicate bundleId:", false);
    } catch (e) {
        console.log("[CASE 25] Rejects duplicate bundleId:", true);
    }

    /* [CASE 26] BundleRegistry.getAll returns copy */
    try {
        const registry = new BundleRegistry();
        const manifest = new BundleManifest(VALID_MANIFEST_OBJ);
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const bundle = new ScenarioBundle({ manifest, descriptors: [desc] });
        registry.register(bundle);
        const all = registry.getAll();
        const beforeCount = all.length;
        all.push("garbage");
        const afterCount = registry.getAll().length;
        console.log("[CASE 26] getAll returns copy:", beforeCount === 1 && afterCount === 1);
    } catch (e) {
        console.log("[CASE 26] getAll returns copy:", false, e.message);
    }

    /* [CASE 27] BundleRegistry unregister */
    try {
        const registry = new BundleRegistry();
        const manifest = new BundleManifest(VALID_MANIFEST_OBJ);
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const bundle = new ScenarioBundle({ manifest, descriptors: [desc] });
        registry.register(bundle);
        const unregistered = registry.unregister("test-bundle");
        const notFound = registry.find("test-bundle") === null;
        console.log("[CASE 27] BundleRegistry unregister:", unregistered && notFound);
    } catch (e) {
        console.log("[CASE 27] BundleRegistry unregister:", false, e.message);
    }

    /* [CASE 28] BundleRegistry clear */
    try {
        const registry = new BundleRegistry();
        const manifest = new BundleManifest(VALID_MANIFEST_OBJ);
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const bundle = new ScenarioBundle({ manifest, descriptors: [desc] });
        registry.register(bundle);
        registry.clear();
        console.log("[CASE 28] BundleRegistry clear:", registry.getAll().length === 0);
    } catch (e) {
        console.log("[CASE 28] BundleRegistry clear:", false, e.message);
    }

    /* =========================
     * RuntimeRegistry Tests
     * ========================= */

    /* [CASE 29] RuntimeRegistry register and get */
    try {
        const registry = new RuntimeRegistry();
        registry.register("test", TestHauntScenario);
        const cls = registry.get("test");
        console.log("[CASE 29] RuntimeRegistry register/get:", cls === TestHauntScenario);
    } catch (e) {
        console.log("[CASE 29] RuntimeRegistry register/get:", false, e.message);
    }

    /* [CASE 30] RuntimeRegistry rejects duplicate */
    try {
        const registry = new RuntimeRegistry();
        registry.register("test", TestHauntScenario);
        registry.register("test", TestHauntScenario);
        console.log("[CASE 30] Rejects duplicate runtimeId:", false);
    } catch (e) {
        console.log("[CASE 30] Rejects duplicate runtimeId:", true);
    }

    /* [CASE 31] RuntimeRegistry rejects non-HauntScenario class */
    try {
        const registry = new RuntimeRegistry();
        registry.register("bad", NonHauntClass);
        console.log("[CASE 31] Rejects non-HauntScenario:", false);
    } catch (e) {
        console.log("[CASE 31] Rejects non-HauntScenario:", true);
    }

    /* [CASE 32] RuntimeRegistry throws RuntimeNotFoundError */
    try {
        const registry = new RuntimeRegistry();
        registry.get("nonexistent");
        console.log("[CASE 32] Throws RuntimeNotFoundError:", false);
    } catch (e) {
        console.log("[CASE 32] Throws RuntimeNotFoundError:", e instanceof RuntimeNotFoundError);
    }

    /* [CASE 33] RuntimeRegistry unregister */
    try {
        const registry = new RuntimeRegistry();
        registry.register("test", TestHauntScenario);
        const unregistered = registry.unregister("test");
        const notFound = registry.has("test") === false;
        console.log("[CASE 33] RuntimeRegistry unregister:", unregistered && notFound);
    } catch (e) {
        console.log("[CASE 33] RuntimeRegistry unregister:", false, e.message);
    }

    /* [CASE 34] RuntimeRegistry clear */
    try {
        const registry = new RuntimeRegistry();
        registry.register("a", TestHauntScenario);
        registry.register("b", AnotherScenario);
        registry.clear();
        console.log("[CASE 34] RuntimeRegistry clear:", registry.getAll().length === 0);
    } catch (e) {
        console.log("[CASE 34] RuntimeRegistry clear:", false, e.message);
    }

    /* =========================
     * ScenarioDefinitionFactory Tests
     * ========================= */

    /* [CASE 35] ScenarioDefinitionFactory.create from descriptor */
    try {
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const def = ScenarioDefinitionFactory.create(desc, TestHauntScenario);
        const ok = def.metadata.id === "haunt_01"
            && def.metadata.title === "Haunt 01"
            && def.metadata.version === "1.0.0"
            && def.runtimeClass === TestHauntScenario;
        console.log("[CASE 35] ScenarioDefinitionFactory.create:", ok);
    } catch (e) {
        console.log("[CASE 35] ScenarioDefinitionFactory.create:", false, e.message);
    }

    /* [CASE 36] ScenarioDefinitionFactory rejects non-Descriptor */
    try {
        ScenarioDefinitionFactory.create({ id: "test" }, TestHauntScenario);
        console.log("[CASE 36] Rejects non-Descriptor:", false);
    } catch (e) {
        console.log("[CASE 36] Rejects non-Descriptor:", true);
    }

    /* =========================
     * ScenarioLoader Tests
     * ========================= */

    /* [CASE 37] ScenarioLoader.loadFromDescriptor loads and registers */
    try {
        const runtimeReg = new RuntimeRegistry();
        const scenarioReg = new ScenarioRegistry();
        runtimeReg.register("haunt_01", TestHauntScenario);
        const loader = new ScenarioLoader(runtimeReg, scenarioReg);
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const def = loader.loadFromDescriptor(desc);
        const ok = scenarioReg.has("haunt_01")
            && def.metadata.id === "haunt_01"
            && def.runtimeClass === TestHauntScenario;
        console.log("[CASE 37] ScenarioLoader.loadFromDescriptor:", ok);
    } catch (e) {
        console.log("[CASE 37] ScenarioLoader.loadFromDescriptor:", false, e.message);
    }

    /* [CASE 38] ScenarioLoader.loadFromBundle with valid bundle */
    try {
        const runtimeReg = new RuntimeRegistry();
        const scenarioReg = new ScenarioRegistry();
        runtimeReg.register("haunt_01", TestHauntScenario);
        const loader = new ScenarioLoader(runtimeReg, scenarioReg);
        const manifest = new BundleManifest(VALID_MANIFEST_OBJ);
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        const bundle = new ScenarioBundle({ manifest, descriptors: [desc] });
        const defs = loader.loadFromBundle(bundle);
        const ok = defs.length === 1
            && scenarioReg.has("haunt_01")
            && defs[0].metadata.id === "haunt_01";
        console.log("[CASE 38] ScenarioLoader.loadFromBundle:", ok);
    } catch (e) {
        console.log("[CASE 38] ScenarioLoader.loadFromBundle:", false, e.message);
    }

    /* [CASE 39] ScenarioLoader throws on missing runtime */
    try {
        const runtimeReg = new RuntimeRegistry();
        const scenarioReg = new ScenarioRegistry();
        const loader = new ScenarioLoader(runtimeReg, scenarioReg);
        const desc = new ScenarioDescriptor({ id: "missing_runtime", title: "Missing", version: "1.0.0" });
        loader.loadFromDescriptor(desc);
        console.log("[CASE 39] Throws on missing runtime:", false);
    } catch (e) {
        console.log("[CASE 39] Throws on missing runtime:", e instanceof ScenarioLoadError);
    }

    /* [CASE 40] ScenarioLoader is the only writer to ScenarioRegistry */
    try {
        const runtimeReg = new RuntimeRegistry();
        const scenarioReg = new ScenarioRegistry();
        runtimeReg.register("haunt_01", TestHauntScenario);
        const loader = new ScenarioLoader(runtimeReg, scenarioReg);
        const desc = new ScenarioDescriptor(VALID_DESCRIPTOR_OBJ);
        loader.loadFromDescriptor(desc);
        const got = scenarioReg.get("haunt_01");
        const ok = got !== null && got.metadata.id === "haunt_01";
        console.log("[CASE 40] ScenarioLoader writes registry:", ok);
    } catch (e) {
        console.log("[CASE 40] ScenarioLoader writes registry:", false, e.message);
    }

    /* =========================
     * Integration Tests
     * ========================= */

    /* [CASE 41] Bundle → ScenarioLoader → ScenarioRegistry full pipeline */
    try {
        const runtimeReg = new RuntimeRegistry();
        const scenarioReg = new ScenarioRegistry();
        runtimeReg.register("haunt_01", TestHauntScenario);
        runtimeReg.register("haunt_02", AnotherScenario);

        const manifest = new BundleManifest({
            bundleId: "full-pipeline-bundle",
            bundleVersion: "2.0.0",
            title: "Full Pipeline",
            scenarioCount: 2
        });
        const desc1 = new ScenarioDescriptor({ id: "haunt_01", title: "Haunt One", version: "1.0.0" });
        const desc2 = new ScenarioDescriptor({ id: "haunt_02", title: "Haunt Two", version: "1.0.0" });
        const bundle = new ScenarioBundle({ manifest, descriptors: [desc1, desc2] });

        const loader = new ScenarioLoader(runtimeReg, scenarioReg);
        loader.loadFromBundle(bundle);

        const d1 = scenarioReg.get("haunt_01");
        const d2 = scenarioReg.get("haunt_02");
        const ok = d1 !== null && d2 !== null
            && d1.metadata.id === "haunt_01"
            && d2.metadata.id === "haunt_02";
        console.log("[CASE 41] Full pipeline:", ok);
    } catch (e) {
        console.log("[CASE 41] Full pipeline:", false, e.message);
    }

    /* [CASE 42] BundleContract defines all constants */
    try {
        const bc = BundleContract;
        const ok = Array.isArray(bc.REQUIRED_MANIFEST_FIELDS)
            && Array.isArray(bc.FORBIDDEN_DESCRIPTOR_FIELDS)
            && typeof bc.SCHEMA_VERSION === "number"
            && bc.VALID_VERSION_REGEX instanceof RegExp;
        console.log("[CASE 42] BundleContract constants:", ok);
    } catch (e) {
        console.log("[CASE 42] BundleContract constants:", false, e.message);
    }

    console.log("===== Scenario Bundle Test End =====");
}
