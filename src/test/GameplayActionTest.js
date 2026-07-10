import { PuppetMasterScenario }
    from "../scenario/scenarios/haunts/PuppetMasterScenario.js";
import { PuppetMasterVictoryCondition }
    from "../scenario/scenarios/haunts/PuppetMasterVictoryCondition.js";
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

function createMinimalContext() {
    const router = new InformationRouter();
    const services = new ScenarioServices({ router });
    const players = new FakePlayerManager();
    players.addPlayer({ id: "hero_1" });
    players.addPlayer({ id: "hero_2" });
    players.addPlayer({ id: "traitor_1" });
    const context = new ScenarioContext({
        players,
        gameState: new FakeGameState(),
        graphMap: new FakeGraphMap(),
        cardManager: new FakeCardManager(),
        services
    });
    return { context, router };
}

function createPuppetMasterRuntime(context, router) {
    const scenario = new PuppetMasterScenario();
    scenario.setVictoryCondition(new PuppetMasterVictoryCondition());
    const runtime = ScenarioRuntimeFactory.create(scenario, context, router);
    runtime.start();
    return runtime;
}

export function runGameplayActionTest() {
    let passed = 0;
    let failed = 0;

    function assert(condition, label) {
        if (condition) {
            console.log(`[PASS] ${label}`);
            passed++;
        } else {
            console.log(`[FAIL] ${label}`);
            failed++;
        }
    }

    const totalStart = Date.now();

    // ── Case 1: Action updates state ──
    try {
        const { context, router } = createMinimalContext();
        const runtime = createPuppetMasterRuntime(context, router);

        assert(runtime.state.get("dollsDestroyed") === 0, "Case 1a: initial dollsDestroyed = 0");

        const action = new PlayerAction({
            id: "act-001",
            type: ActionType.DESTROY,
            playerId: "hero_1",
            payload: { targetId: "doll_1" }
        });

        const result = ScenarioActionHandler.dispatch(runtime, action);
        assert(result.success === true, "Case 1b: dispatch success");
        assert(runtime.state.get("dollsDestroyed") === 1, "Case 1c: dollsDestroyed = 1 after DESTROY");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 1 threw: ${e.message}`);
        failed++;
    }

    // ── Case 2: Multiple actions sequence → victory ──
    try {
        const { context, router } = createMinimalContext();
        const runtime = createPuppetMasterRuntime(context, router);

        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "act-002", type: ActionType.DESTROY, playerId: "hero_1"
        }));
        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "act-003", type: ActionType.DESTROY, playerId: "hero_2"
        }));
        assert(runtime.state.get("dollsDestroyed") === 2, "Case 2a: dollsDestroyed = 2 after 2 actions");

        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "act-004", type: ActionType.DESTROY, playerId: "hero_1"
        }));
        assert(runtime.state.get("dollsDestroyed") === 3, "Case 2b: dollsDestroyed = 3 after 3 actions");

        const victory = runtime.checkVictory();
        assert(victory !== null, "Case 2c: victory triggered after 3 destroys");
        assert(victory.winner === "heroes", "Case 2d: heroes win");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 2 threw: ${e.message}`);
        failed++;
    }

    // ── Case 3: Invalid action rejected by validator ──
    try {
        const valid1 = ActionValidator.validate(null);
        assert(valid1.valid === false, "Case 3a: null action rejected");

        const valid2 = ActionValidator.validate({ id: "", type: ActionType.DESTROY, playerId: "p1" });
        assert(valid2.valid === false, "Case 3b: empty id rejected");

        const valid3 = ActionValidator.validate({ id: "x", type: "INVALID_TYPE", playerId: "p1" });
        assert(valid3.valid === false, "Case 3c: invalid type rejected");

        const valid4 = ActionValidator.validate({ id: "x", type: ActionType.DESTROY, playerId: "" });
        assert(valid4.valid === false, "Case 3d: empty playerId rejected");

        const valid5 = ActionValidator.validate({ id: "x", type: ActionType.MOVE, playerId: "p1" });
        assert(valid5.valid === true, "Case 3e: valid action accepted");

        const valid6 = ActionValidator.validate({
            id: "x", type: ActionType.COLLECT, playerId: "p1",
            payload: { itemId: "key" }
        });
        assert(valid6.valid === true, "Case 3f: valid action with payload accepted");

        const valid7 = ActionValidator.validate({
            id: "x", type: ActionType.ATTACK, playerId: "p1",
            payload: { fn: () => {} }
        });
        assert(valid7.valid === false, "Case 3g: non-serializable payload rejected");

        const valid8 = ActionValidator.validate({
            id: "x", type: ActionType.USE_ITEM, playerId: "p1",
            payload: { itemId: "healing_potion", targetId: "hero_1" }
        });
        assert(valid8.valid === true, "Case 3h: valid complex payload accepted");
    } catch (e) {
        console.log(`[FAIL] Case 3 threw: ${e.message}`);
        failed++;
    }

    // ── Case 4: Unhandled action ignored ──
    try {
        const { context, router } = createMinimalContext();
        const runtime = createPuppetMasterRuntime(context, router);

        const action = new PlayerAction({
            id: "act-005",
            type: ActionType.INTERACT,
            playerId: "hero_1",
            payload: { targetId: "bookshelf" }
        });

        ScenarioActionHandler.dispatch(runtime, action);
        assert(runtime.state.get("dollsDestroyed") === 0, "Case 4: unhandled INTERACT does not change dollsDestroyed");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 4 threw: ${e.message}`);
        failed++;
    }

    // ── Case 5: Snapshot → Restore state correct ──
    try {
        const { context, router } = createMinimalContext();
        const runtime = createPuppetMasterRuntime(context, router);

        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "act-006", type: ActionType.DESTROY, playerId: "hero_1"
        }));
        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "act-007", type: ActionType.DESTROY, playerId: "hero_2"
        }));
        assert(runtime.state.get("dollsDestroyed") === 2, "Case 5a: state = 2 before snapshot");

        const snapshot = runtime.toSnapshot();
        assert(snapshot.state.dollsDestroyed === 2, "Case 5b: snapshot captures dollsDestroyed = 2");

        runtime.restoreFromSnapshot(snapshot);
        assert(runtime.state.get("dollsDestroyed") === 2, "Case 5c: state = 2 after restore");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 5 threw: ${e.message}`);
        failed++;
    }

    // ── Case 6: Restore → Continue Action → Victory ──
    try {
        const { context, router } = createMinimalContext();
        const runtime = createPuppetMasterRuntime(context, router);

        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "act-008", type: ActionType.DESTROY, playerId: "hero_1"
        }));
        assert(runtime.state.get("dollsDestroyed") === 1, "Case 6a: state = 1 before snapshot");

        const snapshot = runtime.toSnapshot();
        runtime.restoreFromSnapshot(snapshot);
        assert(runtime.state.get("dollsDestroyed") === 1, "Case 6b: state = 1 after restore");

        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "act-009", type: ActionType.DESTROY, playerId: "hero_2"
        }));
        ScenarioActionHandler.dispatch(runtime, new PlayerAction({
            id: "act-010", type: ActionType.DESTROY, playerId: "hero_1"
        }));
        assert(runtime.state.get("dollsDestroyed") === 3, "Case 6c: state = 3 after continuing actions");

        const victory = runtime.checkVictory();
        assert(victory !== null, "Case 6d: victory after continue");
        assert(victory.winner === "heroes", "Case 6e: heroes win after continue");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 6 threw: ${e.message}`);
        failed++;
    }

    // ── Case 7: Multi-runtime action isolation ──
    try {
        const ctx1 = createMinimalContext();
        const r1 = createPuppetMasterRuntime(ctx1.context, ctx1.router);

        const ctx2 = createMinimalContext();
        const r2 = createPuppetMasterRuntime(ctx2.context, ctx2.router);

        ScenarioActionHandler.dispatch(r1, new PlayerAction({
            id: "act-011", type: ActionType.DESTROY, playerId: "hero_1"
        }));
        ScenarioActionHandler.dispatch(r1, new PlayerAction({
            id: "act-012", type: ActionType.DESTROY, playerId: "hero_1"
        }));

        assert(r1.state.get("dollsDestroyed") === 2, "Case 7a: runtime 1 has 2 destroys");
        assert(r2.state.get("dollsDestroyed") === 0, "Case 7b: runtime 2 unaffected (0 destroys)");

        ScenarioActionHandler.dispatch(r2, new PlayerAction({
            id: "act-013", type: ActionType.DESTROY, playerId: "traitor_1"
        }));
        assert(r1.state.get("dollsDestroyed") === 2, "Case 7c: runtime 1 still 2");
        assert(r2.state.get("dollsDestroyed") === 1, "Case 7d: runtime 2 now 1");

        r1.destroy();
        r2.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 7 threw: ${e.message}`);
        failed++;
    }

    const elapsed = Date.now() - totalStart;
    console.log(`[GameplayActionTest] ${passed} passed, ${failed} failed (${elapsed}ms)`);
}
