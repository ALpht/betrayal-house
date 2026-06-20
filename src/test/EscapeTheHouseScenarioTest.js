import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { HauntScenario }
    from "../scenario/HauntScenario.js";

import { ScenarioController }
    from "../scenario/ScenarioController.js";

import { ScenarioContext }
    from "../scenario/runtime/ScenarioContext.js";

import { ScenarioRuntimeFactory }
    from "../scenario/ScenarioRuntimeFactory.js";

import { ScenarioState }
    from "../scenario/runtime/ScenarioState.js";

import { VictoryController }
    from "../scenario/victory/VictoryController.js";

import HauntScenarioRegistry
    from "../scenario/HauntScenarioRegistry.js";

import { EscapeTheHouseScenario }
    from "../scenario/scenarios/EscapeTheHouseScenario.js";

import { EscapeVictoryCondition }
    from "../scenario/scenarios/EscapeVictoryCondition.js";

/* =========================
 * Mock Data
 * ========================= */

const ENTRANCE_ROOM = {
    id: "entrance_0",
    tile: { id: 0 }
};

const MOCK_GRAPH_MAP = {
    getAllRooms: () =>
        [ENTRANCE_ROOM]
};

const MOCK_PLAYER_MANAGER = {
    getAllPlayers: () => []
};

const MOCK_CARD_MANAGER = {
    eventDeck: {},
    itemDeck: {},
    omenDeck: {}
};

const MOCK_GAME_STATE = {
    getState: () => "HAUNT",
    setState: () => {},
    getTraitorPlayerId:
        () => null,
    setTraitorPlayerId:
        () => {},
    isExploration:
        () => false,
    isHaunt: () => true
};

const MOCK_CONTEXT =
    new ScenarioContext({
        players:
            MOCK_PLAYER_MANAGER,
        gameState:
            MOCK_GAME_STATE,
        graphMap:
            MOCK_GRAPH_MAP,
        cardManager:
            MOCK_CARD_MANAGER
    });

const MOCK_DEPS = {
    playerManager:
        MOCK_PLAYER_MANAGER,
    graphMap:
        MOCK_GRAPH_MAP,
    cardManager:
        MOCK_CARD_MANAGER
};

export function
    runEscapeTheHouseScenarioTest() {

    console.log(
        "===== Escape The House Scenario Test ====="
    );

    /* =========================
     * [CASE 1] ScenarioDefinition
     *   → createScenario
     * ========================= */

    EventBus.clear();

    const definition =
        HauntScenarioRegistry
            .get("escapeTheHouse");

    console.log(
        "[CASE 1] definition exists:",
        definition !== null
    );

    if (definition) {

        console.log(
            "[CASE 1] metadata.id:",
            definition.metadata.id
                === "escapeTheHouse"
        );

        console.log(
            "[CASE 1] metadata.title:",
            definition.metadata.title
                === "Escape The House"
        );

        console.log(
            "[CASE 1] objectives.heroes:",
            definition.objectives.heroes
                === "Reach the Entrance Hall."
        );

        console.log(
            "[CASE 1] objectives.traitor:",
            definition.objectives.traitor
                === "Prevent all heroes from escaping."
        );

        console.log(
            "[CASE 1] traitorRule:",
            definition.traitorRule
                === "random"
        );

        const scenario =
            definition
                .createScenario();

        console.log(
            "[CASE 1] createScenario instanceof HauntScenario:",
            scenario
                instanceof HauntScenario
        );

        console.log(
            "[CASE 1] createScenario instanceof EscapeTheHouseScenario:",
            scenario
                instanceof
                EscapeTheHouseScenario
        );

        const vc =
            scenario
                .getVictoryCondition();

        console.log(
            "[CASE 1] victoryCondition injected:",
            vc !== null
        );

        console.log(
            "[CASE 1] victoryCondition instanceof EscapeVictoryCondition:",
            vc
                instanceof
                EscapeVictoryCondition
        );

    }

    /* =========================
     * [CASE 2] PLAYER_MOVED →
     *   escapedPlayers updated
     * ========================= */

    EventBus.clear();

    const scenario2 =
        new EscapeTheHouseScenario();

    const state2 =
        new ScenarioState();

    scenario2.start(
        MOCK_CONTEXT,
        state2
    );

    console.log(
        "[CASE 2] escapedPlayers initialized:",
        JSON.stringify(
            state2.get("escapedPlayers")
        ) === "[]"
    );

    EventBus.emit(
        EventTypes.PLAYER_MOVED,
        {
            playerId: "p1",
            fromRoomId:
                "room_other",
            toRoomId: "entrance_0"
        }
    );

    console.log(
        "[CASE 2] PLAYER_MOVED updates escapedPlayers:",
        JSON.stringify(
            state2.get("escapedPlayers")
        ) === '["p1"]'
    );

    scenario2.destroy();

    /* =========================
     * [CASE 3] VictoryCondition
     *   triggers on escaped player
     * ========================= */

    EventBus.clear();

    const scenario3 =
        new EscapeTheHouseScenario();

    scenario3.setVictoryCondition(
        new EscapeVictoryCondition()
    );

    const state3 =
        new ScenarioState();

    scenario3.start(
        MOCK_CONTEXT,
        state3
    );

    state3.set(
        "escapedPlayers",
        ["p1"]
    );

    const result3 =
        scenario3
            .checkVictory(
                MOCK_CONTEXT
            );

    console.log(
        "[CASE 3] checkVictory with escaped player:",
        result3 !== null
    );

    if (result3) {

        console.log(
            "[CASE 3] winner is heroes:",
            result3.winner === "heroes"
        );

        console.log(
            "[CASE 3] reason is escaped:",
            result3.reason === "escaped"
        );

    }

    state3.set(
        "escapedPlayers",
        []
    );

    const noWin3 =
        scenario3
            .checkVictory(
                MOCK_CONTEXT
            );

    console.log(
        "[CASE 3] no escaped players returns null:",
        noWin3 === null
    );

    scenario3.destroy();

    /* =========================
     * [CASE 4] ScenarioState
     *   Save → Load → Continue
     * ========================= */

    EventBus.clear();

    const def4 =
        HauntScenarioRegistry
            .get("escapeTheHouse");

    /* First scenario: capture state */

    const scenario4a =
        def4.createScenario();

    const runtime4a =
        ScenarioRuntimeFactory
            .create(
                scenario4a,
                MOCK_CONTEXT
            );

    runtime4a.start();
    runtime4a.state.set(
        "escapedPlayers",
        ["p1"]
    );

    /* Serialize */

    const snapshot4 =
        runtime4a.toSnapshot();

    const json4 =
        JSON.stringify(
            snapshot4
        );

    const parsed4 =
        JSON.parse(json4);

    /* Second scenario: restore */

    const scenario4b =
        def4.createScenario();

    const runtime4b =
        ScenarioRuntimeFactory
            .create(
                scenario4b,
                MOCK_CONTEXT
            );

    runtime4b.start();
    runtime4b.restoreFromSnapshot(
        parsed4
    );

    const result4 =
        runtime4b
            .checkVictory();

    console.log(
        "[CASE 4] checkVictory after restore:",
        result4 !== null
    );

    if (result4) {

        console.log(
            "[CASE 4] winner is heroes:",
            result4.winner === "heroes"
        );

    }

    /* No escaped players → no victory */

    const def4b =
        HauntScenarioRegistry
            .get("escapeTheHouse");

    const scenario4c =
        def4b.createScenario();

    const runtime4c =
        ScenarioRuntimeFactory
            .create(
                scenario4c,
                MOCK_CONTEXT
            );

    runtime4c.start();
    runtime4c.restoreFromSnapshot({
        scenarioId:
            "escapeTheHouse",
        active: true,
        state: {
            escapedPlayers: []
        }
    });

    const noWin4 =
        runtime4c
            .checkVictory();

    console.log(
        "[CASE 4] no escaped players after restore:",
        noWin4 === null
    );

    scenario4a.destroy();
    scenario4b.destroy();
    scenario4c.destroy();

    /* =========================
     * [CASE 5] Runtime →
     *   Victory Integration
     * ========================= */

    EventBus.clear();

    const controller5 =
        new ScenarioController(
            HauntScenarioRegistry,
            MOCK_GAME_STATE,
            MOCK_DEPS
        );

    const victoryController5 =
        new VictoryController();

    let gameEndedPayload = null;

    EventBus.on(
        EventTypes.GAME_ENDED,
        (p) => {
            gameEndedPayload = p;
        }
    );

    EventBus.emit(
        EventTypes.HAUNT_TRIGGERED,
        {
            scenarioId:
                "escapeTheHouse"
        }
    );

    EventBus.emit(
        EventTypes.TRAITOR_ASSIGNED,
        {
            traitorPlayerId: "p2",
            scenarioId:
                "escapeTheHouse"
        }
    );

    EventBus.emit(
        EventTypes.PLAYER_MOVED,
        {
            playerId: "p1",
            fromRoomId:
                "room_other",
            toRoomId: "entrance_0"
        }
    );

    EventBus.emit(
        EventTypes.TURN_CHANGED,
        {}
    );

    console.log(
        "[CASE 5] GAME_ENDED emitted:",
        gameEndedPayload !== null
    );

    if (gameEndedPayload) {

        console.log(
            "[CASE 5] winner is heroes:",
            gameEndedPayload.winner
                === "heroes"
        );

        console.log(
            "[CASE 5] reason is escaped:",
            gameEndedPayload.reason
                === "escaped"
        );

        console.log(
            "[CASE 5] has scenarioId:",
            gameEndedPayload.scenarioId
                === "escapeTheHouse"
        );

    }

    /* Cleanup scenario EventBus listener */
    const runtime5 =
        controller5
            .getCurrentRuntime();

    if (runtime5) {

        const scenario5 =
            runtime5.definition;

        if (
            scenario5
            && scenario5.destroy
        ) {
            scenario5.destroy();
        }

    }

    controller5.destroy();
    victoryController5.destroy();

}
