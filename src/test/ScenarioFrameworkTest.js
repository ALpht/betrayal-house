import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { HauntScenario }
    from "../scenario/HauntScenario.js";

import { HauntScenarioRegistry }
    from "../scenario/HauntScenarioRegistry.js";

import { ScenarioController }
    from "../scenario/ScenarioController.js";

import { TestScenario }
    from "../scenario/scenarios/TestScenario.js";

import { GameStateManager }
    from "../state/GameStateManager.js";

export function
    runScenarioFrameworkTest() {

    console.log(
        "===== Scenario Framework Test ====="
    );

    /* =========================
     * [CASE 1] HAUNT_TRIGGERED →
     *   SCENARIO_STARTED
     * ========================= */

    EventBus.clear();

    const controller =
        new ScenarioController(
            HauntScenarioRegistry,
            GameStateManager
        );

    let startedEvent = null;

    EventBus.on(
        EventTypes.SCENARIO_STARTED,
        (p) => { startedEvent = p; }
    );

    EventBus.emit(
        EventTypes.HAUNT_TRIGGERED,
        {
            scenarioId:
                "testScenario"
        }
    );

    console.log(
        "[CASE 1] SCENARIO_STARTED emitted:",
        startedEvent !== null
    );

    console.log(
        "[CASE 1] scenarioId matches:",
        startedEvent?.scenarioId
            === "testScenario"
    );

    console.log(
        "[CASE 1] startedAt present:",
        typeof startedEvent?.startedAt
            === "number"
    );

    controller.destroy();

    /* =========================
     * [CASE 2] TestScenario.start()
     *   returns correct result
     * ========================= */

    EventBus.clear();

    const scenario =
        new TestScenario();

    const result =
        scenario.start({});

    console.log(
        "[CASE 2] returns object:",
        typeof result === "object"
            && result !== null
    );

    console.log(
        "[CASE 2] scenarioId is testScenario:",
        result?.scenarioId
            === "testScenario"
    );

    console.log(
        "[CASE 2] startedAt is number:",
        typeof result?.startedAt
            === "number"
    );

    /* =========================
     * [CASE 3] Registry creates
     *   correct scenario type
     * ========================= */

    EventBus.clear();

    const registered =
        HauntScenarioRegistry
            .testScenario();

    console.log(
        "[CASE 3] instanceof HauntScenario:",
        registered
            instanceof HauntScenario
    );

    console.log(
        "[CASE 3] instanceof TestScenario:",
        registered
            instanceof TestScenario
    );

    let unknownError = null;

    const ctrl3 =
        new ScenarioController(
            HauntScenarioRegistry,
            GameStateManager
        );

    try {

        EventBus.emit(
            EventTypes.HAUNT_TRIGGERED,
            {
                scenarioId:
                    "haunt999"
            }
        );

    }
    catch (e) {

        unknownError = e;

    }

    console.log(
        "[CASE 3] unknown scenario throws:",
        unknownError instanceof Error
    );

    ctrl3.destroy();

    /* =========================
     * [CASE 4] destroy() unsubscribes
     *   from EventBus
     * ========================= */

    EventBus.clear();

    const controller2 =
        new ScenarioController(
            HauntScenarioRegistry,
            GameStateManager
        );

    let afterDestroy =
        false;

    EventBus.on(
        EventTypes.SCENARIO_STARTED,
        () => { afterDestroy = true; }
    );

    controller2.destroy();

    EventBus.emit(
        EventTypes.HAUNT_TRIGGERED,
        {
            scenarioId:
                "testScenario"
        }
    );

    console.log(
        "[CASE 4] SCENARIO_STARTED not fired:",
        !afterDestroy
    );

}
