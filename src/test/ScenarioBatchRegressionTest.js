import { HauntScenario }
    from "../scenario/HauntScenario.js";

import { ScenarioRegistry }
    from "../scenario/definition/ScenarioRegistry.js";

import { ScenarioCatalog }
    from "../scenario/authoring/ScenarioCatalog.js";

import { ScenarioDefinition }
    from "../scenario/definition/ScenarioDefinition.js";

import HauntScenarioRegistry
    from "../scenario/HauntScenarioRegistry.js";

import { ScenarioRuntimeFactory }
    from "../scenario/ScenarioRuntimeFactory.js";

import { RegressionContextFactory }
    from "../testing/regression/RegressionContextFactory.js";

import { RegressionRunner }
    from "../testing/regression/RegressionRunner.js";

import { ScenarioBatchRunner }
    from "../testing/regression/ScenarioBatchRunner.js";

import { RegressionSnapshot }
    from "../testing/regression/RegressionSnapshot.js";

import { RegressionReport }
    from "../testing/regression/RegressionReport.js";

import { RegressionScenarioResult }
    from "../testing/regression/RegressionScenarioResult.js";

/* =========================
 * Test Scenario Classes
 * ========================= */

class RegressionAlpha extends HauntScenario {
    static meta = { id: "reg_alpha", traitorRule: "random" };
    start(ctx, state) {
        state.set("alphaKey", "value");
        state.set("count", 1);
    }
}

class RegressionBeta extends HauntScenario {
    static meta = { id: "reg_beta", traitorRule: "random" };
    start(ctx, state) {
        state.set("betaKey", true);
        state.set("count", 42);
    }
}

class RegressionGamma extends HauntScenario {
    static meta = { id: "reg_gamma", traitorRule: "random" };
    start(ctx, state) {
        state.set("gammaKey", 3.14);
    }
}

class BrokenScenario extends HauntScenario {
    static meta = { id: "reg_broken", traitorRule: "random" };
    start(ctx, state) {
        throw new Error("intentional failure");
    }
}

/* =========================
 * Helpers
 * ========================= */

function createTestDefinition(ScenarioClass, id, title) {
    return new ScenarioDefinition({
        metadata: { id, title, description: "Regression test scenario.", difficulty: 1 },
        objectives: { heroes: "Win.", traitor: "Stop." },
        traitorRule: "random",
        runtimeClass: ScenarioClass,
        victoryCondition: null
    });
}

function createTestCatalog() {
    const registry = new ScenarioRegistry();

    registry.register(createTestDefinition(RegressionAlpha, "reg_alpha", "Regression Alpha"));
    registry.register(createTestDefinition(RegressionBeta, "reg_beta", "Regression Beta"));
    registry.register(createTestDefinition(RegressionGamma, "reg_gamma", "Regression Gamma"));

    return new ScenarioCatalog(registry);
}

/* =========================
 * Main Test
 * ========================= */

export function runScenarioBatchRegressionTest() {
    console.log("===== Scenario Batch Regression Test =====");

    const runner = new RegressionRunner();

    /* =========================
     * [CASE 1] Run Single Scenario
     *   RegressionRunner.run(def) returns passed: true
     * ========================= */

    try {
        const def = createTestDefinition(RegressionAlpha, "case1", "Case 1");
        const result = runner.run(def);

        const passedOk = result.passed === true;
        const idOk = result.scenarioId === "case1";
        const snapshotOk = result.snapshot !== null;
        const noError = result.error === null;

        console.log("[CASE 1] Run Single Scenario:", passedOk && idOk && snapshotOk && noError);
    } catch (e) {
        console.log("[CASE 1] Run Single Scenario:", false, e.message);
    }

    /* =========================
     * [CASE 2] Run Multiple Scenarios
     *   3 scenarios, all passed
     * ========================= */

    try {
        const defs = [
            createTestDefinition(RegressionAlpha, "m_a", "Multi A"),
            createTestDefinition(RegressionBeta, "m_b", "Multi B"),
            createTestDefinition(RegressionGamma, "m_c", "Multi C")
        ];

        const results = defs.map(d => runner.run(d));
        const allPassed = results.every(r => r.passed === true);
        const idsOk = results.map(r => r.scenarioId).join(",") === "m_a,m_b,m_c";

        console.log("[CASE 2] Run Multiple Scenarios:", allPassed && idsOk);
    } catch (e) {
        console.log("[CASE 2] Run Multiple Scenarios:", false, e.message);
    }

    /* =========================
     * [CASE 3] Catalog Batch Execution
     *   ScenarioBatchRunner.runAll() with catalog
     * ========================= */

    try {
        const catalog = createTestCatalog();
        const batchRunner = new ScenarioBatchRunner({ catalog, runner });
        const report = batchRunner.runAll();

        const totalOk = report.total === 3;
        const passedOk = report.passed === 3;
        const failedOk = report.failed === 0;
        const reportJson = report.toJSON();
        const jsonFields = reportJson.total === 3 && reportJson.passed === 3 && reportJson.failed === 0;

        console.log("[CASE 3] Catalog Batch Execution:", totalOk && passedOk && failedOk && jsonFields);
    } catch (e) {
        console.log("[CASE 3] Catalog Batch Execution:", false, e.message);
    }

    /* =========================
     * [CASE 4] Snapshot Capture
     *   RegressionSnapshot.capture returns all 4 shapes
     * ========================= */

    try {
        const context = RegressionContextFactory.createContext();
        const router = RegressionContextFactory.createRouter();
        const def = createTestDefinition(RegressionAlpha, "case4", "Case 4");
        const runtime = ScenarioRuntimeFactory.createFromDefinition(def, context, router);
        runtime.start();

        const snapshot = RegressionSnapshot.capture(runtime);

        const hasRuntimeShape = snapshot.runtimeShape.hasState && snapshot.runtimeShape.hasInformation && snapshot.runtimeShape.hasLifecycle;
        const stateKeysNonEmpty = snapshot.stateShape.keys.length > 0;
        const infoShapeHasShape = typeof snapshot.informationShape.packetCount === "number";
        const victoryShapeHasField = "hasVictoryCondition" in snapshot.victoryShape;

        runtime.destroy();

        console.log("[CASE 4] Snapshot Capture:", hasRuntimeShape && stateKeysNonEmpty && infoShapeHasShape && victoryShapeHasField);
    } catch (e) {
        console.log("[CASE 4] Snapshot Capture:", false, e.message);
    }

    /* =========================
     * [CASE 5] Snapshot Comparison
     *   Compatible when same; incompatible on type change
     * ========================= */

    try {
        const contextA = RegressionContextFactory.createContext();
        const routerA = RegressionContextFactory.createRouter();
        const defA = createTestDefinition(RegressionAlpha, "case5", "Case 5");
        const runtimeA = ScenarioRuntimeFactory.createFromDefinition(defA, contextA, routerA);
        runtimeA.start();
        const baseline = RegressionSnapshot.capture(runtimeA);
        runtimeA.destroy();

        const contextB = RegressionContextFactory.createContext();
        const routerB = RegressionContextFactory.createRouter();
        const runtimeB = ScenarioRuntimeFactory.createFromDefinition(defA, contextB, routerB);
        runtimeB.start();
        const current = RegressionSnapshot.capture(runtimeB);
        runtimeB.destroy();

        const compatible = RegressionSnapshot.compare(baseline, current);
        const compatibleOk = compatible.compatible === true && compatible.diffs.length === 0;

        const modified = JSON.parse(JSON.stringify(baseline));
        modified.stateShape.types.count = "string";
        const incompatible = RegressionSnapshot.compare(baseline, modified);
        const incompatibleOk = incompatible.compatible === false && incompatible.diffs.length > 0;

        console.log("[CASE 5] Snapshot Comparison:", compatibleOk && incompatibleOk);
    } catch (e) {
        console.log("[CASE 5] Snapshot Comparison:", false, e.message);
    }

    /* =========================
     * [CASE 6] Failure Isolation
     *   BrokenScenario fails but batch continues
     * ========================= */

    try {
        const registry = new ScenarioRegistry();
        registry.register(createTestDefinition(RegressionAlpha, "fi_good", "Good"));
        registry.register(createTestDefinition(BrokenScenario, "fi_broken", "Broken"));
        registry.register(createTestDefinition(RegressionBeta, "fi_also_good", "Also Good"));

        const catalog = new ScenarioCatalog(registry);
        const batchRunner = new ScenarioBatchRunner({ catalog, runner });
        const report = batchRunner.runAll();

        const totalOk = report.total === 3;
        const passedOk = report.passed === 2;
        const failedOk = report.failed === 1;

        console.log("[CASE 6] Failure Isolation:", totalOk && passedOk && failedOk);
    } catch (e) {
        console.log("[CASE 6] Failure Isolation:", false, e.message);
    }

    /* =========================
     * [CASE 7] Warning Aggregation
     *   RegressionReport sums warnings across results
     * ========================= */

    try {
        const r1 = new RegressionScenarioResult({
            scenarioId: "w_a", passed: true,
            warnings: ["missing description", "low coverage"]
        });
        const r2 = new RegressionScenarioResult({
            scenarioId: "w_b", passed: true,
            warnings: ["deprecated field"]
        });
        const r3 = new RegressionScenarioResult({
            scenarioId: "w_c", passed: true,
            warnings: []
        });

        const report = new RegressionReport([r1, r2, r3]);

        const totalOk = report.total === 3;
        const passedOk = report.passed === 3;
        const warningsOk = report.warnings === 3;

        console.log("[CASE 7] Warning Aggregation:", totalOk && passedOk && warningsOk);
    } catch (e) {
        console.log("[CASE 7] Warning Aggregation:", false, e.message);
    }

    /* =========================
     * [CASE 8] Snapshot Contract Persistence
     *   runtime.toSnapshot() returns state/information/lifecycle
     *   both before and after runtime.destroy()
     * ========================= */

    try {
        const context = RegressionContextFactory.createContext();
        const router = RegressionContextFactory.createRouter();
        const def = createTestDefinition(RegressionGamma, "case8", "Case 8");
        const runtime = ScenarioRuntimeFactory.createFromDefinition(def, context, router);
        runtime.start();

        const pre = runtime.toSnapshot();
        const preState = pre.state !== null && pre.state !== undefined;
        const preInfo = pre.information !== null && pre.information !== undefined;
        const preLifecycle = typeof pre.lifecycleState === "string";

        runtime.destroy();

        const post = runtime.toSnapshot();
        const postState = post.state !== null && post.state !== undefined;
        const postInfo = post.information !== null && post.information !== undefined;
        const postLifecycle = typeof post.lifecycleState === "string";

        console.log("[CASE 8] Snapshot Contract Persistence:", preState && preInfo && preLifecycle && postState && postInfo && postLifecycle);
    } catch (e) {
        console.log("[CASE 8] Snapshot Contract Persistence:", false, e.message);
    }

    console.log("===== Scenario Batch Regression Test End =====");
}