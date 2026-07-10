import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { HauntScenario }
    from "../scenario/HauntScenario.js";

import { ScenarioDefinition }
    from "../scenario/definition/ScenarioDefinition.js";

import { VictoryCondition }
    from "../scenario/victory/VictoryCondition.js";

import { VictoryResult }
    from "../scenario/victory/VictoryResult.js";

import { ScenarioTestContext }
    from "../testing/scenario/ScenarioTestContext.js";

import { ScenarioTestFactory }
    from "../testing/scenario/ScenarioTestFactory.js";

import { ScenarioTestHarness }
    from "../testing/scenario/ScenarioTestHarness.js";

import { ScenarioAssertions }
    from "../testing/scenario/ScenarioAssertions.js";

import { ScenarioSnapshot }
    from "../testing/scenario/ScenarioSnapshot.js";

import { ScenarioFixtures }
    from "../testing/scenario/ScenarioFixtures.js";

/* =========================
 * Test Scenario Definitions
 * ========================= */

class TestHarnessScenario
    extends HauntScenario {

    static meta = {
        id: "testHarnessScenario",
        traitorRule: "random"
    };

    start(context, state) {
        super.start(context, state);
        state.set("scenarioId", "testHarnessScenario");
        state.set("startedAt", Date.now());
    }
}

class VictoryTestScenario
    extends HauntScenario {

    static meta = {
        id: "victoryTestScenario",
        traitorRule: "random"
    };

    start(context, state) {
        super.start(context, state);
        state.set("kills", 0);
    }
}

class TraitorWinCondition
    extends VictoryCondition {

    evaluate(context, state) {
        const kills =
            state.get("kills") || 0;

        if (kills >= 3) {
            return VictoryResult.traitor(
                "victoryTestScenario",
                "all_dead"
            );
        }

        return null;
    }
}

/* =========================
 * Definitions
 * ========================= */

const TEST_HARNESS_DEF =
    new ScenarioDefinition({
        metadata: {
            id: "testHarnessScenario",
            title: "Test Harness Scenario",
            description: "For harness testing.",
            difficulty: 1
        },
        objectives: {
            heroes: "Win.",
            traitor: "Stop them."
        },
        traitorRule: "random",
        runtimeClass: TestHarnessScenario,
        victoryCondition: null
    });

const VICTORY_TEST_DEF =
    new ScenarioDefinition({
        metadata: {
            id: "victoryTestScenario",
            title: "Victory Test",
            description: "Test victory evaluation.",
            difficulty: 1
        },
        objectives: {
            heroes: "Survive.",
            traitor: "Kill all heroes."
        },
        traitorRule: "random",
        runtimeClass: VictoryTestScenario,
        victoryCondition: TraitorWinCondition
    });

export function
    runScenarioTestHarnessTest() {

    console.log(
        "===== Scenario Test Harness Test ====="
    );

    /* =========================
     * CASE 1: Create Scenario
     *
     * Through ScenarioTestFactory
     *   createFromDefinition
     * ========================= */

    EventBus.clear();
    ScenarioFixtures.resetIds();

    console.log(
        "\n--- CASE 1: Create Scenario ---"
    );

    const runtime1 =
        ScenarioTestFactory
            .createFromDefinition(
                TEST_HARNESS_DEF
            );

    ScenarioAssertions.assertTrue(
        "runtime exists",
        runtime1 !== null
    );

    ScenarioAssertions.assertTrue(
        "definition is TestHarnessScenario",
        runtime1.definition
            instanceof TestHarnessScenario
    );

    ScenarioAssertions.assertRuntimeInactive(
        runtime1
    );

    ScenarioAssertions.assertTrue(
        "scenarioId matches",
        runtime1.scenarioId
            === "testHarnessScenario"
    );

    /* =========================
     * CASE 2: Run Runtime
     *
     * Start Runtime
     *   verify lifecycle
     * ========================= */

    EventBus.clear();
    ScenarioFixtures.resetIds();

    console.log(
        "\n--- CASE 2: Run Runtime ---"
    );

    const runtime2 =
        ScenarioTestFactory
            .createFromDefinition(
                TEST_HARNESS_DEF
            );

    const harness2 =
        new ScenarioTestHarness(
            runtime2
        );

    ScenarioAssertions.assertRuntimeInactive(
        runtime2
    );

    harness2.start();

    ScenarioAssertions.assertRuntimeActive(
        runtime2
    );

    ScenarioAssertions.assertStateValue(
        runtime2.state,
        "scenarioId",
        "testHarnessScenario"
    );

    ScenarioAssertions.assertStateExists(
        runtime2.state,
        "startedAt"
    );

    /* =========================
     * CASE 3: Inject Event
     *
     * Through harness.emit()
     *   verify event received
     * ========================= */

    EventBus.clear();
    ScenarioFixtures.resetIds();

    console.log(
        "\n--- CASE 3: Inject Event ---"
    );

    const runtime3 =
        ScenarioTestFactory
            .createFromDefinition(
                TEST_HARNESS_DEF
            );

    const harness3 =
        new ScenarioTestHarness(
            runtime3
        );

    harness3.start();

    let eventReceived = null;

    EventBus.on(
        EventTypes.SCENARIO_UPDATED,
        (p) => { eventReceived = p; }
    );

    harness3.emit(
        EventTypes.SCENARIO_UPDATED,
        { turn: 1 }
    );

    ScenarioAssertions.assertTrue(
        "event received",
        eventReceived !== null
    );

    ScenarioAssertions.assertTrue(
        "event payload turn=1",
        eventReceived?.turn === 1
    );

    /* =========================
     * CASE 4: Evaluate Victory
     *
     * Scenario with VictoryCondition
     *   harness.checkVictory()
     * ========================= */

    EventBus.clear();
    ScenarioFixtures.resetIds();

    console.log(
        "\n--- CASE 4: Evaluate Victory ---"
    );

    const runtime4 =
        ScenarioTestFactory
            .createFromDefinition(
                VICTORY_TEST_DEF
            );

    const harness4 =
        new ScenarioTestHarness(
            runtime4
        );

    /* No kills yet → no victory */

    harness4.start();

    const noVictory =
        harness4.checkVictory();

    ScenarioAssertions.assertNoVictory(
        noVictory
    );

    /* Set kills to 3 → traitor wins */

    runtime4.state.set("kills", 3);

    const victory =
        harness4.checkVictory();

    ScenarioAssertions.assertVictoryResult(
        victory
    );

    ScenarioAssertions.assertTraitorWon(
        victory
    );

    ScenarioAssertions.assertVictoryReason(
        victory,
        "all_dead"
    );

    /* =========================
     * CASE 5: Save → Load → Continue
     *
     * Data-Oriented Snapshot
     *   roundtrip
     * ========================= */

    EventBus.clear();
    ScenarioFixtures.resetIds();

    console.log(
        "\n--- CASE 5: Save -> Load -> Continue ---"
    );

    const runtime5 =
        ScenarioTestFactory
            .createFromDefinition(
                VICTORY_TEST_DEF
            );

    const harness5 =
        new ScenarioTestHarness(
            runtime5
        );

    harness5.start();

    /* Save initial state */

    const snapshot5 =
        ScenarioSnapshot.capture(
            runtime5.toSnapshot()
        );

    ScenarioAssertions.assertTrue(
        "snapshot has scenarioId",
        snapshot5.scenarioId
            === "victoryTestScenario"
    );

    ScenarioAssertions.assertTrue(
        "snapshot lifecycleState started",
        snapshot5.lifecycleState
            === "started"
    );

    /* Modify state → trigger victory */

    runtime5.state.set("kills", 3);

    const victory5 =
        harness5.checkVictory();

    ScenarioAssertions.assertTraitorWon(
        victory5
    );

    /* Restore → victory should be gone */

    ScenarioSnapshot.restore(
        runtime5,
        snapshot5
    );

    const afterRestore =
        harness5.checkVictory();

    ScenarioAssertions.assertNoVictory(
        afterRestore
    );

    ScenarioAssertions.assertStateValue(
        runtime5.state,
        "kills",
        0
    );

    /* JSON roundtrip */

    const json5 =
        ScenarioSnapshot.serialize(
            snapshot5
        );

    const parsed5 =
        ScenarioSnapshot.deserialize(
            json5
        );

    ScenarioSnapshot.assertIdentical(
        snapshot5,
        parsed5
    );

    /* =========================
     * CASE 6: Destroy → Recreate
     *
     * Full lifecycle:
     *   create → start → destroy
     *   → recreate → start
     * ========================= */

    EventBus.clear();
    ScenarioFixtures.resetIds();

    console.log(
        "\n--- CASE 6: Destroy -> Recreate ---"
    );

    const runtime6a =
        ScenarioTestFactory
            .createFromDefinition(
                TEST_HARNESS_DEF
            );

    const harness6a =
        new ScenarioTestHarness(
            runtime6a
        );

    harness6a.start();

    ScenarioAssertions.assertRuntimeActive(
        runtime6a
    );

    harness6a.destroy();

    /* Recreate */

    const runtime6b =
        ScenarioTestFactory
            .createFromDefinition(
                TEST_HARNESS_DEF
            );

    const harness6b =
        new ScenarioTestHarness(
            runtime6b
        );

    harness6b.start();

    ScenarioAssertions.assertRuntimeActive(
        runtime6b
    );

    ScenarioAssertions.assertStateValue(
        runtime6b.state,
        "scenarioId",
        "testHarnessScenario"
    );

    harness6b.destroy();

    /* =========================
     * CASE 7: Multiple Scenario
     *   Isolation
     *
     * Two independent scenarios
     *   verify no cross-contamination
     *   on state / event / victory
     * ========================= */

    EventBus.clear();
    ScenarioFixtures.resetIds();

    console.log(
        "\n--- CASE 7: Multiple Scenario Isolation ---"
    );

    const runtime7a =
        ScenarioTestFactory
            .createFromDefinition(
                VICTORY_TEST_DEF
            );

    const runtime7b =
        ScenarioTestFactory
            .createFromDefinition(
                TEST_HARNESS_DEF
            );

    const harness7a =
        new ScenarioTestHarness(
            runtime7a
        );

    const harness7b =
        new ScenarioTestHarness(
            runtime7b
        );

    harness7a.start();
    harness7b.start();

    /* Modify scenario A state */

    runtime7a.state.set("kills", 5);

    /* Scenario B should NOT have kills */

    ScenarioAssertions.assertStateAbsent(
        runtime7b.state,
        "kills"
    );

    /* Scenario A victory */
    /*   should not affect B */

    const victory7a =
        harness7a.checkVictory();

    ScenarioAssertions.assertVictoryResult(
        victory7a
    );

    const victory7b =
        harness7b.checkVictory();

    ScenarioAssertions.assertNoVictory(
        victory7b
    );

    /* Events should not cross */
    /*   contaminate handlers */

    let eventCountA = 0;
    let eventCountB = 0;

    const handlerA = () => {
        eventCountA++;
    };

    const handlerB = () => {
        eventCountB++;
    };

    EventBus.on(
        "TEST_EVENT_A",
        handlerA
    );

    EventBus.on(
        "TEST_EVENT_B",
        handlerB
    );

    harness7a.emit("TEST_EVENT_A");

    ScenarioAssertions.assertTrue(
        "event A triggered handler A",
        eventCountA === 1
    );

    ScenarioAssertions.assertTrue(
        "event A did NOT trigger handler B",
        eventCountB === 0
    );

    EventBus.off(
        "TEST_EVENT_A",
        handlerA
    );

    EventBus.off(
        "TEST_EVENT_B",
        handlerB
    );

    harness7a.destroy();
    harness7b.destroy();

    console.log(
        "\n===== Scenario Test Harness Test Complete ====="
    );

}
