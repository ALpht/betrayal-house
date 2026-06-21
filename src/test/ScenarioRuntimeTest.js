import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { HauntScenario }
    from "../scenario/HauntScenario.js";

import { ScenarioRuntimeFactory }
    from "../scenario/ScenarioRuntimeFactory.js";

import { ScenarioContext }
    from "../scenario/runtime/ScenarioContext.js";

import { ScenarioState }
    from "../scenario/runtime/ScenarioState.js";

class SpyScenario
    extends HauntScenario {

    static meta = {
        id: "spyScenario"
    };

    constructor() {
        super();
        this.hooks = {
            start: 0,
            onTurnStart: 0,
            onTurnEnd: 0,
            update: 0,
            checkVictory: 0
        };
        this.victoryResult = null;
    }

    start(context, state) {
        this.hooks.start++;
        state.set("started", true);
    }

    onTurnStart(context) {
        this.hooks.onTurnStart++;
    }

    onTurnEnd(context) {
        this.hooks.onTurnEnd++;
    }

    update(context) {
        this.hooks.update++;
    }

    checkVictory(context) {
        this.hooks.checkVictory++;
        return this.victoryResult;
    }

}

class VictoryScenario
    extends HauntScenario {

    static meta = {
        id: "victoryScenario"
    };

    checkVictory(context) {
        return {
            completed: true,
            winner: "traitor"
        };
    }

}

const MOCK_CONTEXT =
    new ScenarioContext({
        players: {
            getAllPlayers: () => []
        },
        gameState: {
            getState: () => "HAUNT"
        },
        graphMap: {
            getAllRooms: () => []
        },
        cardManager: {
            eventDeck: {},
            itemDeck: {},
            omenDeck: {}
        }
    });

export function
    runScenarioRuntimeTest() {

    console.log(
        "===== Scenario Runtime Test ====="
    );

    /* =========================
     * [CASE 1] Create Runtime
     * ========================= */

    EventBus.clear();

    const spy1 =
        new SpyScenario();

    const runtime1 =
        ScenarioRuntimeFactory
            .create(
                spy1,
                MOCK_CONTEXT
            );

    console.log(
        "[CASE 1] runtime exists:",
        runtime1 !== null
    );

    console.log(
        "[CASE 1] isActive false before start:",
        runtime1.isActive === false
    );

    console.log(
        "[CASE 1] scenarioId matches meta:",
        runtime1.scenarioId
            === "spyScenario"
    );

    console.log(
        "[CASE 1] definition is scenario:",
        runtime1.definition
            instanceof SpyScenario
    );

    /* =========================
     * [CASE 2] ScenarioState Set/Get
     * ========================= */

    EventBus.clear();

    const state =
        new ScenarioState();

    state.set(
        "monsterHp",
        20
    );

    state.set(
        "ritualProgress",
        3
    );

    state.set(
        "escapedPlayers",
        []
    );

    console.log(
        "[CASE 2] get monsterHp:",
        state.get("monsterHp")
            === 20
    );

    console.log(
        "[CASE 2] get ritualProgress:",
        state.get("ritualProgress")
            === 3
    );

    console.log(
        "[CASE 2] has monsterHp:",
        state.has("monsterHp")
            === true
    );

    console.log(
        "[CASE 2] has nonexistent:",
        state.has("nonexistent")
            === false
    );

    state.remove("monsterHp");

    console.log(
        "[CASE 2] has after remove:",
        state.has("monsterHp")
            === false
    );

    /* =========================
     * [CASE 3] Serialize Runtime
     * ========================= */

    EventBus.clear();

    const spy3 =
        new SpyScenario();

    const runtime3 =
        ScenarioRuntimeFactory
            .create(
                spy3,
                MOCK_CONTEXT
            );

    runtime3.state.set(
        "monsterHp",
        20
    );

    runtime3.state.set(
        "ritualProgress",
        3
    );

    const snapshot =
        runtime3.toSnapshot();

    console.log(
        "[CASE 3] snapshot has scenarioId:",
        snapshot.scenarioId
            === "spyScenario"
    );

    console.log(
        "[CASE 3] snapshot lifecycleState created:",
        snapshot.lifecycleState
            === "created"
    );

    console.log(
        "[CASE 3] snapshot state has monsterHp:",
        snapshot.state.monsterHp
            === 20
    );

    console.log(
        "[CASE 3] snapshot state has ritualProgress:",
        snapshot.state.ritualProgress
            === 3
    );

    /* =========================
     * [CASE 4] Restore Runtime
     * ========================= */

    EventBus.clear();

    const spy4 =
        new SpyScenario();

    const runtime4 =
        ScenarioRuntimeFactory
            .create(
                spy4,
                MOCK_CONTEXT
            );

    const savedSnapshot = {
        scenarioId: "spyScenario",
        active: true,
        state: {
            monsterHp: 15,
            ritualProgress: 2
        }
    };

    runtime4.restoreFromSnapshot(
        savedSnapshot
    );

    console.log(
        "[CASE 4] isActive after restore:",
        runtime4.isActive === true
    );

    console.log(
        "[CASE 4] monsterHp restored:",
        runtime4.state.get("monsterHp")
            === 15
    );

    console.log(
        "[CASE 4] ritualProgress restored:",
        runtime4.state.get("ritualProgress")
            === 2
    );

    /* =========================
     * [CASE 5] Turn Lifecycle
     * ========================= */

    EventBus.clear();

    const spy5 =
        new SpyScenario();

    const runtime5 =
        ScenarioRuntimeFactory
            .create(
                spy5,
                MOCK_CONTEXT
            );

    runtime5.start();

    console.log(
        "[CASE 5] isActive after start:",
        runtime5.isActive === true
    );

    console.log(
        "[CASE 5] start hook called:",
        spy5.hooks.start === 1
    );

    console.log(
        "[CASE 5] state initialized:",
        runtime5.state.get("started")
            === true
    );

    runtime5.onTurnStart();

    console.log(
        "[CASE 5] onTurnStart hook called:",
        spy5.hooks.onTurnStart === 1
    );

    runtime5.onTurnEnd();

    console.log(
        "[CASE 5] onTurnEnd hook called:",
        spy5.hooks.onTurnEnd === 1
    );

    runtime5.update();

    console.log(
        "[CASE 5] update hook called:",
        spy5.hooks.update === 1
    );

    /* =========================
     * [CASE 6] Victory Hook Invocation
     * ========================= */

    EventBus.clear();

    const victoryScenario =
        new VictoryScenario();

    const runtime6 =
        ScenarioRuntimeFactory
            .create(
                victoryScenario,
                MOCK_CONTEXT
            );

    const result =
        runtime6.checkVictory();

    console.log(
        "[CASE 6] checkVictory called:",
        result !== null
    );

    console.log(
        "[CASE 6] completed is true:",
        result?.completed === true
    );

    console.log(
        "[CASE 6] winner is traitor:",
        result?.winner === "traitor"
    );

}
