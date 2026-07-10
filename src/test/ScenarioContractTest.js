import { HauntScenario } from "../scenario/HauntScenario.js";
import { VictoryCondition } from "../scenario/victory/VictoryCondition.js";
import { ScenarioValidator } from "../scenario/content/ScenarioValidator.js";
import { ScenarioLint } from "../scenario/content/ScenarioLint.js";
import { ValidationError, ValidationErrorCollection } from "../scenario/content/ValidationError.js";
import { EscapeTheHouseDefinition } from "../scenario/scenarios/EscapeTheHouseDefinition.js";

class ValidScenario extends HauntScenario {
    static meta = { id: "valid" };
    start(context, state) { state.set("ok", true); }
}

class NoStartScenario extends HauntScenario {
    static meta = { id: "noStart" };
}

export function runScenarioContractTest() {
    console.log("===== Scenario Contract Test =====");

    const validator = new ScenarioValidator();
    const linter = new ScenarioLint();

    /* =========================
     * [CASE 1] Valid Scenario
     *   EscapeTheHouseDefinition must pass
     * ========================= */

    try {
        validator.validate(EscapeTheHouseDefinition);
        console.log("[CASE 1] Valid scenario passes:", true);
    } catch (e) {
        console.log("[CASE 1] Valid scenario passes:", false);
    }

    /* =========================
     * [CASE 2] Missing Metadata
     *   Empty definition must throw
     * ========================= */

    try {
        validator.validate({});
        console.log("[CASE 2] Missing metadata throws:", false);
    } catch (e) {
        const hasMetaError = e instanceof ValidationErrorCollection
            && e.errors.some(err => err.code === "MISSING_METADATA");
        console.log("[CASE 2] Missing metadata throws:", hasMetaError);
    }

    /* =========================
     * [CASE 3] Missing Title
     *   metadata.id present but no title
     * ========================= */

    try {
        validator.validate({
            metadata: { id: "test" },
            traitorRule: "random",
            runtimeClass: ValidScenario
        });
        console.log("[CASE 3] Missing title throws:", false);
    } catch (e) {
        const hasTitleError = e instanceof ValidationErrorCollection
            && e.errors.some(err => err.code === "INVALID_METADATA_TITLE");
        console.log("[CASE 3] Missing title throws:", hasTitleError);
    }

    /* =========================
     * [CASE 4] Invalid Traitor Rule
     *   traitorRule not in registry
     * ========================= */

    try {
        validator.validate({
            metadata: { id: "test", title: "Test" },
            traitorRule: "nonexistent",
            runtimeClass: ValidScenario
        });
        console.log("[CASE 4] Invalid traitorRule throws:", false);
    } catch (e) {
        const hasRuleError = e instanceof ValidationErrorCollection
            && e.errors.some(err => err.code === "INVALID_TRAITOR_RULE");
        console.log("[CASE 4] Invalid traitorRule throws:", hasRuleError);
    }

    /* =========================
     * [CASE 5] Missing RuntimeClass
     *   No runtimeClass in definition
     * ========================= */

    try {
        validator.validate({
            metadata: { id: "test", title: "Test" },
            traitorRule: "random"
        });
        console.log("[CASE 5] Missing runtimeClass throws:", false);
    } catch (e) {
        const hasClassError = e instanceof ValidationErrorCollection
            && e.errors.some(err => err.code === "MISSING_RUNTIME_CLASS");
        console.log("[CASE 5] Missing runtimeClass throws:", hasClassError);
    }

    /* =========================
     * [CASE 6] Missing Start Hook
     *   runtimeClass does not override start()
     * ========================= */

    try {
        validator.validate({
            metadata: { id: "test", title: "Test" },
            traitorRule: "random",
            runtimeClass: NoStartScenario
        });
        console.log("[CASE 6] Missing start hook throws:", false);
    } catch (e) {
        const hasHookError = e instanceof ValidationErrorCollection
            && e.errors.some(err => err.code === "MISSING_START_HOOK");
        console.log("[CASE 6] Missing start hook throws:", hasHookError);
    }

    /* =========================
     * [CASE 7] Invalid VictoryCondition Type
     *   victoryCondition is a plain object
     * ========================= */

    try {
        validator.validate({
            metadata: { id: "test", title: "Test" },
            traitorRule: "random",
            runtimeClass: ValidScenario,
            victoryCondition: {}
        });
        console.log("[CASE 7] Invalid victoryCondition type throws:", false);
    } catch (e) {
        const hasVcError = e instanceof ValidationErrorCollection
            && e.errors.some(err => err.code === "INVALID_VICTORY_CONDITION_TYPE");
        console.log("[CASE 7] Invalid victoryCondition type throws:", hasVcError);
    }

    /* =========================
     * [CASE 8] Serialization Failure
     *   Non-serializable data in definition
     * ========================= */

    try {
        validator.validate({
            metadata: { id: "test", title: "Test" },
            traitorRule: "random",
            runtimeClass: ValidScenario,
            objectives: {
                heroes: "Find the exit",
                traitor: () => {}
            }
        });
        console.log("[CASE 8] Serialization failure throws:", false);
    } catch (e) {
        const hasSerialError = e instanceof ValidationErrorCollection
            && e.errors.some(err => err.code === "SERIALIZATION_ERROR");
        console.log("[CASE 8] Serialization failure throws:", hasSerialError);
    }

    /* =========================
     * [CASE 9] Backward Compat
     *   Minimal valid definition passes
     * ========================= */

    try {
        validator.validate({
            metadata: { id: "simple", title: "Simple" },
            traitorRule: "random",
            runtimeClass: ValidScenario
        });
        console.log("[CASE 9] Backward compatible passes:", true);
    } catch (e) {
        console.log("[CASE 9] Backward compatible passes:", false);
    }

    /* =========================
     * [CASE 10] Lint — Missing Description
     *   Lint returns MISSING_DESCRIPTION warning
     * ========================= */

    const lintResult10 = linter.lint({
        metadata: { id: "test", title: "Test" },
        traitorRule: "random",
        runtimeClass: ValidScenario
    });

    const hasMissingDesc = lintResult10.some(w => w.code === "MISSING_DESCRIPTION");
    console.log("[CASE 10] Lint warns missing description:", hasMissingDesc);

    /* =========================
     * [CASE 11] Lint — victoryCondition null
     *   Validate passes, Lint warns
     * ========================= */

    const def11 = {
        metadata: { id: "test", title: "Test" },
        traitorRule: "random",
        runtimeClass: ValidScenario,
        victoryCondition: null
    };

    let validatePassed11 = false;
    try {
        validator.validate(def11);
        validatePassed11 = true;
    } catch (e) {
        validatePassed11 = false;
    }

    const lintResult11 = linter.lint(def11);
    const hasMissingVc = lintResult11.some(w => w.code === "MISSING_VICTORY_CONDITION");

    console.log("[CASE 11] victoryCondition null passes validate:", validatePassed11);
    console.log("[CASE 11] Lint warns missing victoryCondition:", hasMissingVc);

    /* =========================
     * [CASE 12] Multiple Validation
     *   validateAll catches all errors
     * ========================= */

    try {
        validator.validateAll([
            {
                metadata: { id: "a", title: "A" },
                traitorRule: "random",
                runtimeClass: ValidScenario
            },
            {
                metadata: { id: "b" },
                traitorRule: "random",
                runtimeClass: ValidScenario
            }
        ]);
        console.log("[CASE 12] validateAll with invalid throws:", false);
    } catch (e) {
        const isCollection = e instanceof ValidationErrorCollection;
        const hasTitleError = isCollection
            && e.errors.some(err => err.code === "INVALID_METADATA_TITLE");
        console.log("[CASE 12] validateAll with invalid throws:", isCollection && hasTitleError);
    }

    /* =========================
     * [CASE 12b] validateAll with all valid
     * ========================= */

    try {
        validator.validateAll([
            {
                metadata: { id: "a", title: "A" },
                traitorRule: "random",
                runtimeClass: ValidScenario
            },
            {
                metadata: { id: "b", title: "B" },
                traitorRule: "random",
                runtimeClass: ValidScenario
            }
        ]);
        console.log("[CASE 12b] validateAll all valid passes:", true);
    } catch (e) {
        console.log("[CASE 12b] validateAll all valid passes:", false);
    }

    /* =========================
     * [CASE 12c] validateAll returns ALL errors
     * ========================= */

    try {
        validator.validateAll([
            {},
            {}
        ]);
        console.log("[CASE 12c] validateAll returns all errors:", false);
    } catch (e) {
        const allErrors = e instanceof ValidationErrorCollection
            ? e.errors.length : 0;
        console.log("[CASE 12c] validateAll returns all errors:", allErrors >= 2);
    }
}
