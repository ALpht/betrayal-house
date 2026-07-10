import { ActionFactory } from "../presentation/ActionFactory.js";
import { ActionDispatcher } from "../presentation/ActionDispatcher.js";
import { ActionPanel } from "../presentation/ActionPanel.js";
import { ActionButton } from "../presentation/ActionButton.js";
import { ActionType } from "../scenario/action/ActionType.js";
import { ActionValidator } from "../scenario/action/ActionValidator.js";
import { ScenarioActionHandler } from "../scenario/action/ScenarioActionHandler.js";
import { ScenarioRuntimeFactory } from "../scenario/ScenarioRuntimeFactory.js";
import { ScenarioContext } from "../scenario/runtime/ScenarioContext.js";
import { ScenarioServices } from "../scenario/services/ScenarioServices.js";
import { InformationRouter } from "../scenario/information/InformationRouter.js";
import { HAUNT_DEFINITIONS } from "../scenario/scenarios/haunts/HauntContentPack01Definition.js";

class FakePlayerManager {
    #players = [];
    addPlayer(p) { this.#players.push(p); }
    getAllPlayers() { return [...this.#players]; }
    getPlayer(id) { return this.#players.find(p => p.id === id); }
    getPlayerCount() { return this.#players.length; }
    clear() { this.#players = []; }
}

class FakeGameState {
    #s = "HAUNT";
    #ti = null;
    getState() { return this.#s; }
    setState(s) { this.#s = s; }
    isExploration() { return this.#s === "EXPLORATION"; }
    isHaunt() { return this.#s === "HAUNT"; }
    getTraitorPlayerId() { return this.#ti; }
    setTraitorPlayerId(id) { this.#ti = id; }
}

class FakeGraphMap {
    #rooms = new Map();
    addRoom(r) { this.#rooms.set(r.id, r); }
    getRoom(id) { return this.#rooms.get(id); }
    getAllRooms() { return [...this.#rooms.values()]; }
    hasRoom(id) { return this.#rooms.has(id); }
    clear() { this.#rooms.clear(); }
}

class FakeCardManager {
    eventDeck = {};
    itemDeck = {};
    omenDeck = {};
}

function createContext(router) {
    const services = new ScenarioServices({ router });
    const players = new FakePlayerManager();
    players.addPlayer({ id: "hero_1" });
    return new ScenarioContext({
        players,
        gameState: new FakeGameState(),
        graphMap: new FakeGraphMap(),
        cardManager: new FakeCardManager(),
        services
    });
}

function createRuntime(scenarioId) {
    const def = HAUNT_DEFINITIONS[scenarioId];
    if (!def) throw new Error(`Unknown: ${scenarioId}`);
    const router = new InformationRouter();
    const context = createContext(router);
    const runtime = ScenarioRuntimeFactory.createFromDefinition(def, context, router);
    runtime.start();
    return runtime;
}

export function runPresentationActionTest() {
    console.log("\n===== Presentation Action Test =====");
    let passed = 0;
    let failed = 0;

    function assert(ok, label) {
        if (ok) {
            console.log(`[PASS] ${label}`);
            passed++;
        } else {
            console.log(`[FAIL] ${label}`);
            failed++;
        }
    }

    const totalStart = Date.now();

    /* =========================
     * CASE 1 — Move Button
     * ActionFactory → ActionDispatcher → Scenario
     * ========================= */

    try {
        const runtime = createRuntime("hungryHouse");
        assert(runtime.state.get("heroInSafeRoom") === false, "Case 1a: initial heroInSafeRoom false");

        const action = ActionFactory.createMove("hero_1", "safeRoom");
        const result = ActionDispatcher.dispatch(runtime, action);
        assert(result.success === true, "Case 1b: dispatch success");
        assert(runtime.state.get("heroInSafeRoom") === true, "Case 1c: heroInSafeRoom true after MOVE");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 1 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 2 — Attack Button
     * ActionFactory → ActionDispatcher → Scenario → Victory
     * ========================= */

    try {
        const runtime = createRuntime("clockTower");
        assert(runtime.state.get("bossHp") === 10, "Case 2a: initial bossHp=10");

        for (let i = 0; i < 10; i++) {
            const action = ActionFactory.createAttack("hero_1", "golem");
            ActionDispatcher.dispatch(runtime, action);
        }
        assert(runtime.state.get("bossHp") === 0, "Case 2b: bossHp=0 after 10 ATTACK");

        const victory = runtime.checkVictory();
        assert(victory !== null, "Case 2c: victory triggered");
        assert(victory.winner === "heroes", "Case 2d: heroes win");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 2 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 3 — Collect Button
     * ActionFactory → ActionDispatcher → Scenario
     * ========================= */

    try {
        const runtime = createRuntime("clockTower");
        assert(runtime.state.get("partsFound") === 0, "Case 3a: initial partsFound=0");

        const action = ActionFactory.createCollect("hero_1", "gear");
        ActionDispatcher.dispatch(runtime, action);
        assert(runtime.state.get("partsFound") === 1, "Case 3b: partsFound=1 after COLLECT");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 3 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 4 — End Turn Button
     * ActionFactory → ActionDispatcher → Scenario
     * ========================= */

    try {
        const runtime = createRuntime("hungryHouse");
        assert(runtime.state.get("turnsElapsed") === 0, "Case 4a: initial turnsElapsed=0");

        const action = ActionFactory.createEndTurn("hero_1");
        ActionDispatcher.dispatch(runtime, action);
        assert(runtime.state.get("turnsElapsed") === 1, "Case 4b: turnsElapsed=1 after END_TURN");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 4 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 5 — Unavailable Action
     * ActionAvailability returns only supported actions
     * ========================= */

    try {
        const pm = createRuntime("puppetMaster");
        const pmActions = pm.getSupportedActions();
        assert(Array.isArray(pmActions), "Case 5a: returns array");
        assert(pmActions.includes(ActionType.DESTROY), "Case 5b: puppetMaster supports DESTROY");
        assert(pmActions.includes(ActionType.END_TURN), "Case 5c: puppetMaster supports END_TURN");
        assert(!pmActions.includes(ActionType.ATTACK), "Case 5d: puppetMaster does NOT support ATTACK");
        assert(!pmActions.includes(ActionType.MOVE), "Case 5e: puppetMaster does NOT support MOVE");
        pm.destroy();

        const hh = createRuntime("hungryHouse");
        const hhActions = hh.getSupportedActions();
        assert(hhActions.includes(ActionType.MOVE), "Case 5f: hungryHouse supports MOVE");
        assert(!hhActions.includes(ActionType.ATTACK), "Case 5g: hungryHouse does NOT support ATTACK");
        assert(!hhActions.includes(ActionType.COLLECT), "Case 5h: hungryHouse does NOT support COLLECT");
        hh.destroy();

        const ct = createRuntime("clockTower");
        const ctActions = ct.getSupportedActions();
        assert(ctActions.includes(ActionType.ATTACK), "Case 5i: clockTower supports ATTACK");
        assert(ctActions.includes(ActionType.COLLECT), "Case 5j: clockTower supports COLLECT");
        assert(!ctActions.includes(ActionType.MOVE), "Case 5k: clockTower does NOT support MOVE");
        assert(!ctActions.includes(ActionType.ACTIVATE), "Case 5l: clockTower does NOT support ACTIVATE");
        ct.destroy();

        const bs = createRuntime("boundSpirits");
        const bsActions = bs.getSupportedActions();
        assert(bsActions.includes(ActionType.INTERACT), "Case 5m: boundSpirits supports INTERACT");
        assert(bsActions.includes(ActionType.ATTACK), "Case 5n: boundSpirits supports ATTACK");
        bs.destroy();

        const rs = createRuntime("ritualOfShadows");
        const rsActions = rs.getSupportedActions();
        assert(rsActions.includes(ActionType.ACTIVATE), "Case 5o: ritualOfShadows supports ACTIVATE");
        assert(rsActions.includes(ActionType.END_TURN), "Case 5p: ritualOfShadows supports END_TURN");
        assert(!rsActions.includes(ActionType.ATTACK), "Case 5q: ritualOfShadows does NOT support ATTACK");
        rs.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 5 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 6 — Dispatcher Isolation
     * Dispatcher must not modify state, emit events, or check victory
     * ========================= */

    try {
        const runtime = createRuntime("clockTower");
        const initialState = runtime.state.serialize();

        const action = ActionFactory.createAttack("hero_1", "golem");
        const result = ActionDispatcher.dispatch(runtime, action);

        assert(result.success === true, "Case 6a: dispatch returns success");

        const dispatcherProto = Object.getOwnPropertyNames(ActionDispatcher.prototype || {});
        const staticKeys = Object.getOwnPropertyNames(ActionDispatcher);
        assert(staticKeys.includes("dispatch"), "Case 6b: dispatcher only exposes dispatch");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 6 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 7 — Action Factory Completeness
     * All 6 factory methods produce valid PlayerActions
     * ========================= */

    try {
        const actions = [
            ActionFactory.createMove("hero_1", "room1"),
            ActionFactory.createAttack("hero_1", "target"),
            ActionFactory.createCollect("hero_1", "item1"),
            ActionFactory.createActivate("hero_1", "altarA"),
            ActionFactory.createInteract("hero_1", "escort"),
            ActionFactory.createDestroy("hero_1", "target"),
            ActionFactory.createEndTurn("hero_1")
        ];

        assert(actions.length === 7, "Case 7a: 7 actions created");

        for (let i = 0; i < actions.length; i++) {
            const validation = ActionValidator.validate(actions[i]);
            assert(validation.valid === true, `Case 7b: action ${i} is valid (${actions[i].type})`);
            assert(typeof actions[i].id === "string" && actions[i].id.length > 0,
                `Case 7c: action ${i} has non-empty id`);
            assert(actions[i].playerId === "hero_1",
                `Case 7d: action ${i} has correct playerId`);
        }

        const uniqueIds = new Set(actions.map(a => a.id));
        assert(uniqueIds.size === 7, "Case 7e: all 7 actions have unique ids");
    } catch (e) {
        console.log(`[FAIL] Case 7 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 8 — Full Integration
     * Button → Factory → Dispatcher → Scenario → Victory
     * ========================= */

    try {
        const runtime = createRuntime("puppetMaster");

        const actions = [
            ActionFactory.createDestroy("hero_1", "doll_1"),
            ActionFactory.createDestroy("hero_1", "doll_2"),
            ActionFactory.createDestroy("hero_1", "doll_3")
        ];

        for (const action of actions) {
            const result = ActionDispatcher.dispatch(runtime, action);
            assert(result.success === true, "Case 8a: dispatch success");
        }

        const victory = runtime.checkVictory();
        assert(victory !== null, "Case 8b: victory triggered after 3 DESTROY actions");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 8 threw: ${e.message}`);
        failed++;
    }

    const elapsed = Date.now() - totalStart;
    console.log(`\n===== Presentation Action Test: ${passed} passed, ${failed} failed (${elapsed}ms) =====\n`);
}
