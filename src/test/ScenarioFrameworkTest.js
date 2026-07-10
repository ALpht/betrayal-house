import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { HauntScenario }
    from "../scenario/HauntScenario.js";

import { ScenarioRegistry }
    from "../scenario/definition/ScenarioRegistry.js";

import { ScenarioDefinition }
    from "../scenario/definition/ScenarioDefinition.js";

import HauntScenarioRegistry
    from "../scenario/HauntScenarioRegistry.js";

import { ScenarioController }
    from "../scenario/ScenarioController.js";

import { TestScenario }
    from "../scenario/scenarios/TestScenario.js";

import { ScenarioState }
    from "../scenario/runtime/ScenarioState.js";

import { GameStateManager }
    from "../state/GameStateManager.js";

const MOCK_DEPS = {
    playerManager: {
        getAllPlayers: () => []
    },
    graphMap: {
        getAllRooms: () => []
    },
    cardManager: {
        eventDeck: {},
        itemDeck: {},
        omenDeck: {}
    }
};

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
            GameStateManager,
            MOCK_DEPS
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
        "[CASE 1] has traitorRule:",
        startedEvent?.traitorRule
            === "random"
    );

    controller.destroy();

    /* =========================
     * [CASE 2] TestScenario.start()
     *   stores data in state
     * ========================= */

    EventBus.clear();

    const scenario =
        new TestScenario();

    const state =
        new ScenarioState();

    scenario.start({}, state);

    console.log(
        "[CASE 2] state has scenarioId:",
        state.get("scenarioId")
            === "testScenario"
    );

    console.log(
        "[CASE 2] state has startedAt:",
        typeof state.get("startedAt")
            === "number"
    );

    /* =========================
     * [CASE 3] Registry lookup +
     *   Definition.createScenario()
     * ========================= */

    EventBus.clear();

    const definition =
        HauntScenarioRegistry
            .get("testScenario");

    console.log(
        "[CASE 3] registry has testScenario:",
        definition !== null
    );

    const created =
        definition.createScenario();

    console.log(
        "[CASE 3] instanceof HauntScenario:",
        created
            instanceof HauntScenario
    );

    console.log(
        "[CASE 3] instanceof TestScenario:",
        created
            instanceof TestScenario
    );

    let unknownError = null;

    const ctrl3 =
        new ScenarioController(
            HauntScenarioRegistry,
            GameStateManager,
            MOCK_DEPS
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
            GameStateManager,
            MOCK_DEPS
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

    /* =========================
     * [CASE 5] createScenario()
     *   returns TestScenario
     * ========================= */

    const def5 =
        HauntScenarioRegistry
            .get("testScenario");

    const s5 =
        def5.createScenario();

    console.log(
        "[CASE 5] createScenario returns TestScenario:",
        s5 instanceof TestScenario
    );

    /* =========================
     * [CASE 6] createScenario()
     *   no victoryCondition for TestScenario
     * ========================= */

    console.log(
        "[CASE 6] victoryCondition is null:",
        s5.getVictoryCondition()
            === null
    );

}
