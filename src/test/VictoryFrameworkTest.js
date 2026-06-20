import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";

import { VictoryCondition } from "../scenario/victory/VictoryCondition.js";
import { VictoryResult } from "../scenario/victory/VictoryResult.js";
import { VictoryController } from "../scenario/victory/VictoryController.js";
import { WINNER, REASON } from "../scenario/victory/VictoryTypes.js";

import { HauntScenario } from "../scenario/HauntScenario.js";
import { ScenarioController } from "../scenario/ScenarioController.js";
import { ScenarioState } from "../scenario/runtime/ScenarioState.js";
import { GameStateManager } from "../state/GameStateManager.js";

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

/* =========================
 * Test Conditions
 * ========================= */

class TestCondition extends VictoryCondition {
    evaluate(context, state) {
        return VictoryResult.heroes("testVictory", "escaped");
    }
}

class NoWinCondition extends VictoryCondition {
    evaluate(context, state) {
        return null;
    }
}

class ProgressCondition extends VictoryCondition {
    evaluate(context, state) {
        const kills = state.get("kills") || 0;
        if (kills >= 5) {
            return VictoryResult.heroes("testProgress", "survived");
        }
        return null;
    }
}

class VictoryTestScenario extends HauntScenario {
    static meta = { id: "testVictory", traitorRule: "random" };
    constructor() {
        super();
        this.setVictoryCondition(new TestCondition());
    }
}

class NoWinScenario extends HauntScenario {
    static meta = { id: "testNoWin", traitorRule: "random" };
    constructor() {
        super();
        this.setVictoryCondition(new NoWinCondition());
    }
}

export function runVictoryFrameworkTest() {
    console.log("===== Victory Framework Test =====");

    /* =========================
     * [CASE 1] VictoryCondition evaluate
     *   returns VictoryResult
     * ========================= */

    EventBus.clear();

    const context1 = {};
    const state1 = new ScenarioState();

    const condition1 = new TestCondition();
    const result1 = condition1.evaluate(context1, state1);

    console.log(
        "[CASE 1] evaluate returns VictoryResult:",
        result1 instanceof VictoryResult
    );

    console.log(
        "[CASE 1] winner is heroes:",
        result1?.winner === "heroes"
    );

    console.log(
        "[CASE 1] reason is escaped:",
        result1?.reason === "escaped"
    );

    /* =========================
     * [CASE 2] VictoryCondition evaluate
     *   returns null
     * ========================= */

    EventBus.clear();

    const condition2 = new NoWinCondition();
    const result2 = condition2.evaluate({}, new ScenarioState());

    console.log(
        "[CASE 2] evaluate returns null:",
        result2 === null
    );

    /* =========================
     * [CASE 3] VictoryResult roundtrip
     *   through JSON
     * ========================= */

    EventBus.clear();

    const original = VictoryResult.heroes("haunt-001", "escaped");
    const json = JSON.stringify(original.toJSON());
    const parsed = JSON.parse(json);
    const restored = VictoryResult.fromJSON(parsed);

    console.log(
        "[CASE 3] scenarioId preserved:",
        restored.scenarioId === "haunt-001"
    );

    console.log(
        "[CASE 3] winner preserved:",
        restored.winner === "heroes"
    );

    console.log(
        "[CASE 3] reason preserved:",
        restored.reason === "escaped"
    );

    /* =========================
     * [CASE 4] GAME_ENDED emission
     *   full chain through controllers
     * ========================= */

    EventBus.clear();

    let gameEndedPayload = null;
    EventBus.on(EventTypes.GAME_ENDED, (p) => {
        gameEndedPayload = p;
    });

    const registry4 = {
        testVictory: () => new VictoryTestScenario()
    };

    const controller4 = new ScenarioController(
        registry4,
        GameStateManager,
        MOCK_DEPS
    );

    const victoryController = new VictoryController();

    EventBus.emit(EventTypes.HAUNT_TRIGGERED, {
        scenarioId: "testVictory"
    });

    EventBus.emit(EventTypes.TRAITOR_ASSIGNED, {});

    EventBus.emit(EventTypes.TURN_CHANGED, {});

    console.log(
        "[CASE 4] GAME_ENDED emitted:",
        gameEndedPayload !== null
    );

    console.log(
        "[CASE 4] winner is heroes:",
        gameEndedPayload?.winner === "heroes"
    );

    console.log(
        "[CASE 4] reason is escaped:",
        gameEndedPayload?.reason === "escaped"
    );

    console.log(
        "[CASE 4] has scenarioId:",
        gameEndedPayload?.scenarioId === "testVictory"
    );

    controller4.destroy();
    victoryController.destroy();

    /* =========================
     * [CASE 5] VictoryController.restore()
     *   does NOT re-emit GAME_ENDED
     * ========================= */

    EventBus.clear();

    let emitCount = 0;
    EventBus.on(EventTypes.GAME_ENDED, () => { emitCount++; });

    const vc5 = new VictoryController();
    vc5.restore({
        scenarioId: "haunt-001",
        winner: "heroes",
        reason: "escaped"
    });

    console.log(
        "[CASE 5] hasResult is true:",
        vc5.hasResult() === true
    );

    console.log(
        "[CASE 5] restored winner:",
        vc5.getResult()?.winner === "heroes"
    );

    console.log(
        "[CASE 5] GAME_ENDED not re-emitted:",
        emitCount === 0
    );

    vc5.destroy();

    /* =========================
     * [CASE 6] VictoryCondition
     *   uses ScenarioState, not own state
     * ========================= */

    EventBus.clear();

    const state6 = new ScenarioState();
    const condition6 = new ProgressCondition();

    state6.set("kills", 5);
    const r6a = condition6.evaluate({}, state6);

    console.log(
        "[CASE 6] kills=5 returns VictoryResult:",
        r6a instanceof VictoryResult
    );

    state6.set("kills", 2);
    const r6b = condition6.evaluate({}, state6);

    console.log(
        "[CASE 6] kills=2 returns null:",
        r6b === null
    );

    const ownKeys = Object.keys(condition6);
    console.log(
        "[CASE 6] condition has no hidden state:",
        !ownKeys.some(k => k !== "constructor" && k !== "evaluate")
    );
}
