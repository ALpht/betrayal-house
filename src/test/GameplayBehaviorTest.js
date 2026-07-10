import { ScenarioRuntimeFactory }
    from "../scenario/ScenarioRuntimeFactory.js";
import { ScenarioContext }
    from "../scenario/runtime/ScenarioContext.js";
import { InformationRouter }
    from "../scenario/information/InformationRouter.js";
import { ScenarioServices }
    from "../scenario/services/ScenarioServices.js";
import { PlayerAction }
    from "../scenario/action/PlayerAction.js";
import { ActionType }
    from "../scenario/action/ActionType.js";
import { ActionValidator }
    from "../scenario/action/ActionValidator.js";
import { ScenarioActionHandler }
    from "../scenario/action/ScenarioActionHandler.js";
import { RegressionRunner }
    from "../testing/regression/RegressionRunner.js";
import { RegressionContextFactory }
    from "../testing/regression/RegressionContextFactory.js";
import { RegressionSnapshot }
    from "../testing/regression/RegressionSnapshot.js";
import { HAUNT_DEFINITIONS }
    from "../scenario/scenarios/haunts/HauntContentPack01Definition.js";

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
    players.addPlayer({ id: "hero_2" });
    players.addPlayer({ id: "traitor_1" });
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
    return { runtime, router };
}

function destroyRuntime(r) {
    if (r && r.destroy) r.destroy();
}

export function runGameplayBehaviorTest() {
    console.log("\n===== Gameplay Behavior Validation Test =====");
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
     * CASE 1 — Move Action
     * HungryHouse: MOVE { destination: "safeRoom" } → heroInSafeRoom=true
     * ========================= */

    try {
        const { runtime, router } = createRuntime("hungryHouse");
        assert(runtime.state.get("heroInSafeRoom") === false, "Case 1a: initial heroInSafeRoom false");

        const result = ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c1-act-1", type: ActionType.MOVE, playerId: "hero_1",
            payload: { destination: "safeRoom" }
        }));
        assert(result.success === true, "Case 1b: dispatch success");
        assert(runtime.state.get("heroInSafeRoom") === true, "Case 1c: heroInSafeRoom true after MOVE");

        destroyRuntime(runtime);
    } catch (e) {
        console.log(`[FAIL] Case 1 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 2 — Attack → Victory
     * ClockTower: 10× ATTACK → bossHp=0 → hero win
     * ========================= */

    try {
        const { runtime, router } = createRuntime("clockTower");
        assert(runtime.state.get("bossHp") === 10, "Case 2a: initial bossHp=10");

        for (let i = 0; i < 10; i++) {
            ScenarioActionHandler.dispatch(runtime, new PlayerAction({
                id: `c2-atk-${i}`, type: ActionType.ATTACK, playerId: "hero_1",
                payload: { target: "golem" }
            }));
        }
        assert(runtime.state.get("bossHp") === 0, "Case 2b: bossHp=0 after 10 ATTACK");

        const victory = runtime.checkVictory();
        assert(victory !== null, "Case 2c: victory triggered");
        assert(victory.winner === "heroes", "Case 2d: heroes win");
        assert(victory.reason === "boss_defeated", "Case 2e: reason boss_defeated");

        destroyRuntime(runtime);
    } catch (e) {
        console.log(`[FAIL] Case 2 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 3 — Collect → Victory
     * PuppetMaster: 3× DESTROY → dollsDestroyed=3 → hero win
     * ========================= */

    try {
        const { runtime, router } = createRuntime("puppetMaster");
        assert(runtime.state.get("dollsDestroyed") === 0, "Case 3a: initial dollsDestroyed=0");

        for (let i = 0; i < 3; i++) {
            ScenarioActionHandler.dispatch(runtime, new PlayerAction({
                id: `c3-col-${i}`, type: ActionType.DESTROY, playerId: "hero_1"
            }));
        }
        assert(runtime.state.get("dollsDestroyed") === 3, "Case 3b: dollsDestroyed=3");

        const victory = runtime.checkVictory();
        assert(victory !== null, "Case 3c: victory triggered");
        assert(victory.winner === "heroes", "Case 3d: heroes win");

        destroyRuntime(runtime);
    } catch (e) {
        console.log(`[FAIL] Case 3 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 4 — Activate → Victory
     * RitualOfShadows: 3× ACTIVATE { altar } → all altars true → hero win
     * ========================= */

    try {
        const { runtime, router } = createRuntime("ritualOfShadows");
        assert(runtime.state.get("altarA") === false, "Case 4a: initial altarA false");
        assert(runtime.state.get("altarB") === false, "Case 4b: initial altarB false");
        assert(runtime.state.get("altarC") === false, "Case 4c: initial altarC false");

        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c4-act-1", type: ActionType.ACTIVATE, playerId: "hero_1",
            payload: { altar: "altarA" }
        }));
        assert(runtime.state.get("altarA") === true, "Case 4d: altarA true");
        assert(runtime.state.get("altarB") === false, "Case 4e: altarB still false");

        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c4-act-2", type: ActionType.ACTIVATE, playerId: "hero_1",
            payload: { altar: "altarB" }
        }));
        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c4-act-3", type: ActionType.ACTIVATE, playerId: "hero_1",
            payload: { altar: "altarC" }
        }));
        assert(runtime.state.get("altarA") === true, "Case 4f: altarA still true");
        assert(runtime.state.get("altarB") === true, "Case 4g: altarB true");
        assert(runtime.state.get("altarC") === true, "Case 4h: altarC true");

        const victory = runtime.checkVictory();
        assert(victory !== null, "Case 4i: victory triggered");
        assert(victory.winner === "heroes", "Case 4j: heroes win");
        assert(victory.reason === "ritual_complete", "Case 4k: reason ritual_complete");

        destroyRuntime(runtime);
    } catch (e) {
        console.log(`[FAIL] Case 4 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 5 — Escort → Victory
     * BoundSpirits: 3× INTERACT { type: "escort" } → escortProgress=3 → hero win
     * ========================= */

    try {
        const { runtime, router } = createRuntime("boundSpirits");
        assert(runtime.state.get("escortProgress") === 0, "Case 5a: initial escortProgress=0");

        for (let i = 0; i < 3; i++) {
            ScenarioActionHandler.dispatch(runtime, new PlayerAction({
                id: `c5-esc-${i}`, type: ActionType.INTERACT, playerId: "hero_1",
                payload: { type: "escort" }
            }));
        }
        assert(runtime.state.get("escortProgress") === 3, "Case 5b: escortProgress=3");

        const victory = runtime.checkVictory();
        assert(victory !== null, "Case 5c: victory triggered");
        assert(victory.winner === "heroes", "Case 5d: heroes win");

        destroyRuntime(runtime);
    } catch (e) {
        console.log(`[FAIL] Case 5 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 6 — Unhandled Action
     * Valid action type to non-handling scenario → no-op, no throw, no state change
     * ========================= */

    try {
        const { runtime, router } = createRuntime("puppetMaster");
        const before = runtime.state.get("dollsDestroyed");

        const result = ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c6-ign-1", type: ActionType.MOVE, playerId: "hero_1",
            payload: { destination: "someRoom" }
        }));
        assert(result.success === true, "Case 6a: dispatch returns success");
        assert(runtime.state.get("dollsDestroyed") === before, "Case 6b: state not modified");

        const result2 = ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c6-ign-2", type: ActionType.ATTACK, playerId: "hero_1",
            payload: { target: "nonexistent" }
        }));
        assert(result2.success === true, "Case 6c: unhandled ATTACK also success");
        assert(runtime.state.get("dollsDestroyed") === before, "Case 6d: state still unchanged");

        destroyRuntime(runtime);
    } catch (e) {
        console.log(`[FAIL] Case 6 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 7 — Action Sequence
     * ClockTower: COLLECT×4 → ATTACK×10 → END_TURN → Victory
     * ========================= */

    try {
        const { runtime, router } = createRuntime("clockTower");

        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c7-col-1", type: ActionType.COLLECT, playerId: "hero_1",
            payload: { itemId: "gear" }
        }));
        assert(runtime.state.get("partsFound") === 1, "Case 7a: partsFound=1");

        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c7-col-2", type: ActionType.COLLECT, playerId: "hero_1",
            payload: { itemId: "spring" }
        }));
        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c7-col-3", type: ActionType.COLLECT, playerId: "hero_1",
            payload: { itemId: "pendulum" }
        }));
        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c7-col-4", type: ActionType.COLLECT, playerId: "hero_1",
            payload: { itemId: "cog" }
        }));
        assert(runtime.state.get("partsFound") === 4, "Case 7b: partsFound=4 after 4 COLLECT");

        for (let i = 0; i < 10; i++) {
            ScenarioActionHandler.dispatch(runtime, new PlayerAction({
                id: `c7-atk-${i}`, type: ActionType.ATTACK, playerId: "hero_1",
                payload: { target: "golem" }
            }));
        }
        assert(runtime.state.get("bossHp") === 0, "Case 7c: bossHp=0 after 10 ATTACK");

        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c7-end", type: ActionType.END_TURN, playerId: "hero_1"
        }));
        assert(runtime.state.get("bossHp") === 0, "Case 7d: bossHp still 0 after END_TURN");

        const victory = runtime.checkVictory();
        assert(victory !== null, "Case 7e: victory triggered");
        assert(victory.winner === "heroes", "Case 7f: heroes win");
        assert(victory.reason === "boss_defeated", "Case 7g: reason boss_defeated");

        destroyRuntime(runtime);
    } catch (e) {
        console.log(`[FAIL] Case 7 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 8 — Snapshot Continue
     * Action → save → restore (state + router) → continue → Victory
     * ========================= */

    try {
        const { runtime, router } = createRuntime("puppetMaster");

        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c8-act-1", type: ActionType.DESTROY, playerId: "hero_1"
        }));
        assert(runtime.state.get("dollsDestroyed") === 1, "Case 8a: state=1 before snapshot");

        const snapshot = runtime.toSnapshot();
        assert(snapshot.state.dollsDestroyed === 1, "Case 8b: snapshot captures dollsDestroyed=1");
        assert(snapshot.information !== null, "Case 8c: snapshot has information");

        runtime.restoreFromSnapshot(snapshot);
        assert(runtime.state.get("dollsDestroyed") === 1, "Case 8d: state=1 after restore");
        assert(runtime.router.getAllPackets().length === router.getAllPackets().length,
            "Case 8e: router packets preserved after restore");

        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c8-act-2", type: ActionType.DESTROY, playerId: "hero_2"
        }));
        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "c8-act-3", type: ActionType.DESTROY, playerId: "hero_1"
        }));
        assert(runtime.state.get("dollsDestroyed") === 3, "Case 8f: state=3 after continue");

        const victory = runtime.checkVictory();
        assert(victory !== null, "Case 8g: victory after continue");
        assert(victory.winner === "heroes", "Case 8h: heroes win after continue");

        destroyRuntime(runtime);
    } catch (e) {
        console.log(`[FAIL] Case 8 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 9 — Scenario Isolation
     * 5 runtimes simultaneously, actions don't cross-contaminate
     * ========================= */

    try {
        const runtimes = ["puppetMaster", "hungryHouse", "boundSpirits", "clockTower", "ritualOfShadows"]
            .map(id => createRuntime(id));

        runtimes[0].runtime.state.set("dollsDestroyed", 99);

        for (let i = 1; i < runtimes.length; i++) {
            const state = runtimes[i].runtime.state.serialize();
            const hasDolls = "dollsDestroyed" in state;
            assert(!hasDolls, `Case 9: runtime ${i} not contaminated by puppetMaster state`);
        }

        for (const r of runtimes) destroyRuntime(r.runtime);
    } catch (e) {
        console.log(`[FAIL] Case 9 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 10 — Action Isolation
     * Runtime A dispatch(ATTACK) does not affect Runtime B
     * ========================= */

    try {
        const a = createRuntime("clockTower");
        const b = createRuntime("clockTower");

        assert(a.runtime.state.get("bossHp") === 10, "Case 10a: runtime A bossHp=10");
        assert(b.runtime.state.get("bossHp") === 10, "Case 10b: runtime B bossHp=10");

        for (let i = 0; i < 5; i++) {
            ScenarioActionHandler.dispatch(a.runtime, new PlayerAction({
                id: `c10-atk-${i}`, type: ActionType.ATTACK, playerId: "hero_1",
                payload: { target: "golem" }
            }));
        }
        assert(a.runtime.state.get("bossHp") === 5, "Case 10c: runtime A bossHp=5 after 5 ATTACK");
        assert(b.runtime.state.get("bossHp") === 10, "Case 10d: runtime B bossHp still 10");

        ScenarioActionHandler.dispatch(b.runtime, new PlayerAction({
            id: "c10-atk-b", type: ActionType.ATTACK, playerId: "hero_2",
            payload: { target: "golem" }
        }));
        assert(a.runtime.state.get("bossHp") === 5, "Case 10e: runtime A bossHp still 5");
        assert(b.runtime.state.get("bossHp") === 9, "Case 10f: runtime B bossHp=9");

        destroyRuntime(a.runtime);
        destroyRuntime(b.runtime);
    } catch (e) {
        console.log(`[FAIL] Case 10 threw: ${e.message}`);
        failed++;
    }

    /* =========================
     * CASE 11 — Regression
     * Golden snapshot → replay → semantic compare
     * ========================= */

    try {
        const runner = new RegressionRunner();

        for (const [id, def] of Object.entries(HAUNT_DEFINITIONS)) {
            const resultA = runner.run(def);
            assert(resultA.passed === true, `Case 11: ${id} first run passed`);
            assert(resultA.snapshot !== null, `Case 11: ${id} has snapshot`);

            const resultB = runner.run(def);
            assert(resultB.passed === true, `Case 11: ${id} second run passed`);

            const compare = RegressionSnapshot.compare(resultA.snapshot, resultB.snapshot);
            assert(compare.compatible === true, `Case 11: ${id} snapshots compatible`);
            assert(compare.diffs.length === 0, `Case 11: ${id} no diffs`);
        }
    } catch (e) {
        console.log(`[FAIL] Case 11 threw: ${e.message}`);
        failed++;
    }

    const elapsed = Date.now() - totalStart;
    console.log(`\n===== Gameplay Behavior Test: ${passed} passed, ${failed} failed (${elapsed}ms) =====\n`);
}
