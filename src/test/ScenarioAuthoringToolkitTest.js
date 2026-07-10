import { HauntScenario } from "../scenario/HauntScenario.js";
import { VictoryCondition } from "../scenario/victory/VictoryCondition.js";
import { ScenarioValidator } from "../scenario/content/ScenarioValidator.js";
import { ScenarioLint } from "../scenario/content/ScenarioLint.js";
import { BuilderError } from "../scenario/authoring/BuilderError.js";
import { ScenarioBuilder } from "../scenario/authoring/ScenarioBuilder.js";
import { ScenarioTemplate } from "../scenario/authoring/ScenarioTemplate.js";
import { ScenarioCatalog } from "../scenario/authoring/ScenarioCatalog.js";
import { ScenarioFactory } from "../scenario/authoring/ScenarioFactory.js";
import { ScenarioRegistry } from "../scenario/definition/ScenarioRegistry.js";
import { ScenarioDefinition } from "../scenario/definition/ScenarioDefinition.js";
import { ScenarioRuntimeFactory } from "../scenario/ScenarioRuntimeFactory.js";
import { InformationRouter } from "../scenario/information/InformationRouter.js";
import { ScenarioTestContext } from "../testing/scenario/ScenarioTestContext.js";

class ValidScenario extends HauntScenario {
    static meta = { id: "valid" };
    start(context, state) { state.set("ok", true); }
}

class TestVictory extends VictoryCondition {
    evaluate(context, state) { return null; }
}

export function runScenarioAuthoringToolkitTest() {
    console.log("===== Scenario Authoring Toolkit Test =====");

    const validator = new ScenarioValidator();
    const linter = new ScenarioLint();

    /* =========================
     * [CASE 1] Builder — complete build
     *   All required fields filled → valid ScenarioDefinition
     * ========================= */

    let case1Def = null;
    try {
        case1Def = new ScenarioBuilder()
            .setTitle("Escape the Dark")
            .setId("escape_dark")
            .setDescription("A dark escape scenario")
            .setObjectives({ heroes: "Find the exit", traitor: "Stop them" })
            .setTraitorRule("random")
            .setRuntimeClass(ValidScenario)
            .build();

        const isDef = case1Def instanceof ScenarioDefinition;
        const idOk = case1Def.metadata.id === "escape_dark";
        const titleOk = case1Def.metadata.title === "Escape the Dark";
        const descOk = case1Def.metadata.description === "A dark escape scenario";
        const ruleOk = case1Def.traitorRule === "random";
        const classOk = case1Def.runtimeClass === ValidScenario;
        const objHeroes = case1Def.objectives.heroes === "Find the exit";
        const objTraitor = case1Def.objectives.traitor === "Stop them";

        console.log("[CASE 1] Builder complete build:", isDef && idOk && titleOk && descOk && ruleOk && classOk && objHeroes && objTraitor);
    } catch (e) {
        console.log("[CASE 1] Builder complete build:", false, e.message);
    }

    /* =========================
     * [CASE 2] Builder — missing runtimeClass
     *   build() must throw BuilderError
     * ========================= */

    try {
        new ScenarioBuilder()
            .setTitle("No Runtime")
            .setDescription("Missing runtime class")
            .setObjectives({ heroes: "Win", traitor: "Stop" })
            .setTraitorRule("random")
            .build();

        console.log("[CASE 2] Builder missing runtimeClass throws:", false);
    } catch (e) {
        const isBuilderError = e instanceof BuilderError;
        const fieldCorrect = e.field === "runtimeClass";
        console.log("[CASE 2] Builder missing runtimeClass throws:", isBuilderError && fieldCorrect);
    }

    /* =========================
     * [CASE 3] Builder — missing traitorRule
     *   build() must throw BuilderError
     * ========================= */

    try {
        new ScenarioBuilder()
            .setTitle("No Rule")
            .setDescription("Missing traitor rule")
            .setObjectives({ heroes: "Win", traitor: "Stop" })
            .setRuntimeClass(ValidScenario)
            .build();

        console.log("[CASE 3] Builder missing traitorRule throws:", false);
    } catch (e) {
        const isBuilderError = e instanceof BuilderError;
        const fieldCorrect = e.field === "traitorRule";
        console.log("[CASE 3] Builder missing traitorRule throws:", isBuilderError && fieldCorrect);
    }

    /* =========================
     * [CASE 4] Template → fill → build
     *   ScenarioTemplate.standardHaunt() returns builder, fill and build
     * ========================= */

    try {
        const def = ScenarioTemplate.standardHaunt()
            .setTitle("Standard Haunt")
            .setId("standard_haunt")
            .setDescription("A standard haunt scenario")
            .setObjectives({ heroes: "Survive", traitor: "Kill all" })
            .setRuntimeClass(ValidScenario)
            .build();

        const isDef = def instanceof ScenarioDefinition;
        const ruleOk = def.traitorRule === "random";
        const titleOk = def.metadata.title === "Standard Haunt";

        console.log("[CASE 4] Template standardHaunt build:", isDef && ruleOk && titleOk);
    } catch (e) {
        console.log("[CASE 4] Template standardHaunt build:", false, e.message);
    }

    /* =========================
     * [CASE 5] Catalog — get / getAll
     *   Registry wrapped by Catalog
     * ========================= */

    const registry5 = new ScenarioRegistry();
    const catalog5 = new ScenarioCatalog(registry5);

    const def5 = new ScenarioBuilder()
        .setTitle("Catalog Test")
        .setId("catalog_test")
        .setDescription("Test for catalog")
        .setObjectives({ heroes: "Win", traitor: "Stop" })
        .setTraitorRule("random")
        .setRuntimeClass(ValidScenario)
        .build();

    registry5.register(def5);

    const got = catalog5.get("catalog_test");
    const all = catalog5.getAll();
    const getOk = got === def5;
    const allOk = all.length === 1 && all[0] === def5;

    console.log("[CASE 5] Catalog get/getAll:", getOk && allOk);

    /* =========================
     * [CASE 6] Catalog — findByDifficulty
     *   Filter definitions by difficulty
     * ========================= */

    const registry6 = new ScenarioRegistry();
    const catalog6 = new ScenarioCatalog(registry6);

    const def6a = new ScenarioBuilder()
        .setTitle("Easy Mode")
        .setId("easy")
        .setDescription("Easy")
        .setObjectives({ heroes: "A", traitor: "B" })
        .setTraitorRule("random")
        .setRuntimeClass(ValidScenario)
        .setDifficulty(1)
        .build();

    const def6b = new ScenarioBuilder()
        .setTitle("Hard Mode")
        .setId("hard")
        .setDescription("Hard")
        .setObjectives({ heroes: "A", traitor: "B" })
        .setTraitorRule("random")
        .setRuntimeClass(ValidScenario)
        .setDifficulty(3)
        .build();

    registry6.register(def6a);
    registry6.register(def6b);

    const easyResults = catalog6.findByDifficulty(1);
    const hardResults = catalog6.findByDifficulty(3);
    const easyOk = easyResults.length === 1 && easyResults[0].metadata.id === "easy";
    const hardOk = hardResults.length === 1 && hardResults[0].metadata.id === "hard";

    console.log("[CASE 6] Catalog findByDifficulty:", easyOk && hardOk);

    /* =========================
     * [CASE 7] Catalog — has
     *   Check existence
     * ========================= */

    const hasValid = catalog5.has("catalog_test");
    const hasInvalid = catalog5.has("nonexistent");
    console.log("[CASE 7] Catalog has valid/invalid:", hasValid === true && hasInvalid === false);

    /* =========================
     * [CASE 8] Factory — createFromDefinition
     *   Full pipeline: validate → lint → runtime
     * ========================= */

    const factory8 = new ScenarioFactory({
        catalog: null,
        runtimeFactory: ScenarioRuntimeFactory,
        validator,
        linter
    });

    const def8 = new ScenarioBuilder()
        .setTitle("Factory Test")
        .setId("factory_test")
        .setDescription("Test for factory")
        .setObjectives({ heroes: "Win", traitor: "Stop" })
        .setTraitorRule("random")
        .setRuntimeClass(ValidScenario)
        .setVictoryCondition(TestVictory)
        .build();

    try {
        const context8 = ScenarioTestContext.create();
        const router8 = new InformationRouter();
        const result8 = factory8.createFromDefinition(def8, context8, router8);

        const hasRuntime = result8.runtime !== null && result8.runtime !== undefined;
        const hasWarnings = Array.isArray(result8.warnings);
        const isScenarioFactoryResult = result8.constructor.name === "ScenarioFactoryResult";

        console.log("[CASE 8] Factory createFromDefinition:", isScenarioFactoryResult && hasRuntime && hasWarnings);
    } catch (e) {
        console.log("[CASE 8] Factory createFromDefinition:", false, e.message);
    }

    /* =========================
     * [CASE 9] Factory — warnings contain lint content
     *   Lint runs and warnings are returned
     * ========================= */

    const factory9 = new ScenarioFactory({
        catalog: null,
        runtimeFactory: ScenarioRuntimeFactory,
        validator,
        linter
    });

    const def9 = new ScenarioBuilder()
        .setTitle("Lint Warnings")
        .setId("lint_warnings")
        .setDescription("Test lint warnings")
        .setObjectives({ heroes: "Win", traitor: "Stop" })
        .setTraitorRule("random")
        .setRuntimeClass(ValidScenario)
        .build();

    try {
        const context9 = ScenarioTestContext.create();
        const router9 = new InformationRouter();
        const result9 = factory9.createFromDefinition(def9, context9, router9);

        const hasMissingVc = result9.warnings.some(w => w.code === "MISSING_VICTORY_CONDITION");
        console.log("[CASE 9] Factory warnings contain lint:", hasMissingVc);
    } catch (e) {
        console.log("[CASE 9] Factory warnings contain lint:", false, e.message);
    }

    /* =========================
     * [CASE 10] Factory — validation failure
     *   Invalid definition → throws, runtime not created
     * ========================= */

    const factory10 = new ScenarioFactory({
        catalog: null,
        runtimeFactory: ScenarioRuntimeFactory,
        validator,
        linter
    });

    const invalidDef = {
        metadata: { id: "bad" }
    };

    try {
        factory10.createFromDefinition(invalidDef, null, null);
        console.log("[CASE 10] Factory validation failure throws:", false);
    } catch (e) {
        const isValidationError = e.constructor.name === "ValidationErrorCollection"
            || (e.errors && Array.isArray(e.errors));
        console.log("[CASE 10] Factory validation failure throws:", isValidationError);
    }

    /* =========================
     * [CASE 11] Builder — auto-generated id from title
     *   When id not set, it's derived from title
     * ========================= */

    try {
        const def = new ScenarioBuilder()
            .setTitle("My Awesome Scenario")
            .setDescription("Testing auto id")
            .setObjectives({ heroes: "A", traitor: "B" })
            .setTraitorRule("random")
            .setRuntimeClass(ValidScenario)
            .build();

        const expectedId = "my_awesome_scenario";
        const idOk = def.metadata.id === expectedId;

        console.log("[CASE 11] Builder auto-generates id:", idOk);
    } catch (e) {
        console.log("[CASE 11] Builder auto-generates id:", false, e.message);
    }

    /* =========================
     * [CASE 12] Factory — create via catalog
     *   Full pipeline with catalog lookup
     * ========================= */

    const registry12 = new ScenarioRegistry();
    const catalog12 = new ScenarioCatalog(registry12);

    const def12 = new ScenarioBuilder()
        .setTitle("Catalog Factory")
        .setId("catalog_factory")
        .setDescription("Full pipeline test")
        .setObjectives({ heroes: "Escape", traitor: "Hunt" })
        .setTraitorRule("random")
        .setRuntimeClass(ValidScenario)
        .setVictoryCondition(TestVictory)
        .build();

    registry12.register(def12);

    const factory12 = new ScenarioFactory({
        catalog: catalog12,
        runtimeFactory: ScenarioRuntimeFactory,
        validator,
        linter
    });

    try {
        const context12 = ScenarioTestContext.create();
        const router12 = new InformationRouter();
        const result12 = factory12.create("catalog_factory", context12, router12);

        const hasRuntime = result12.runtime !== null;
        const hasWarnings = Array.isArray(result12.warnings);

        console.log("[CASE 12] Factory create via catalog:", hasRuntime && hasWarnings);
    } catch (e) {
        console.log("[CASE 12] Factory create via catalog:", false, e.message);
    }

    /* =========================
     * [CASE 13] Builder — missing title throws
     *   No title → BuilderError
     * ========================= */

    try {
        new ScenarioBuilder()
            .setDescription("No title")
            .setObjectives({ heroes: "A", traitor: "B" })
            .setTraitorRule("random")
            .setRuntimeClass(ValidScenario)
            .build();

        console.log("[CASE 13] Builder missing title throws:", false);
    } catch (e) {
        const isBuilderError = e instanceof BuilderError;
        const fieldCorrect = e.field === "title";
        console.log("[CASE 13] Builder missing title throws:", isBuilderError && fieldCorrect);
    }

    console.log("===== Scenario Authoring Toolkit Test End =====");
}
