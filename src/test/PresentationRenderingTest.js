import { ActionAvailabilityQuery } from "../presentation/query/ActionAvailabilityQuery.js";
import { ActionPresentationModel } from "../presentation/query/ActionPresentationModel.js";
import { ActionPanel } from "../presentation/ActionPanel.js";
import { ActionButton } from "../presentation/ActionButton.js";
import { ActionFactory } from "../presentation/ActionFactory.js";
import { ActionDispatcher } from "../presentation/ActionDispatcher.js";
import { ActionType } from "../scenario/action/ActionType.js";
import { ActionValidator } from "../scenario/action/ActionValidator.js";
import { ScenarioRuntimeFactory } from "../scenario/ScenarioRuntimeFactory.js";
import { ScenarioContext } from "../scenario/runtime/ScenarioContext.js";
import { ScenarioServices } from "../scenario/services/ScenarioServices.js";
import { InformationRouter } from "../scenario/information/InformationRouter.js";
import { HAUNT_DEFINITIONS } from "../scenario/scenarios/haunts/HauntContentPack01Definition.js";

if (typeof document === "undefined") {
    const createElement = (tag) => {
        const children = [];
        const listeners = {};
        const el = {
            tagName: tag.toUpperCase(),
            textContent: "",
            disabled: false,
            children,
            listeners,
            appendChild(child) { children.push(child); return child; },
            remove() {},
            addEventListener(event, handler) { listeners[event] = handler; },
            click() { if (listeners.click) listeners.click(); },
            querySelector(selector) {
                if (selector === "button" && children.length > 0) return children[0];
                return children.find(c => c.tagName?.toLowerCase() === selector.toLowerCase()) || null;
            },
            setAttribute() {}
        };
        return el;
    };
    global.document = { createElement };
}

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

export function runPresentationRenderingTest() {
    console.log("\n===== Presentation Rendering Test =====");
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

    /* =======================
     * CASE 1 — Query builds correct model
     * ======================= */
    try {
        const runtime = createRuntime("puppetMaster");
        const query = new ActionAvailabilityQuery();
        const model = query.buildModel(runtime);

        assert(model instanceof ActionPresentationModel, "Case 1a: returns ActionPresentationModel");
        assert(model.scenarioId === "puppetMaster", "Case 1b: correct scenarioId");
        assert(Array.isArray(model.actions), "Case 1c: actions is array");
        assert(model.actions.length === 2, "Case 1d: 2 actions (DESTROY, END_TURN)");
        assert(model.actions.some(a => a.type === ActionType.DESTROY), "Case 1e: has DESTROY");
        assert(model.actions.some(a => a.type === ActionType.END_TURN), "Case 1f: has END_TURN");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 1 threw: ${e.message}`);
        failed++;
    }

    /* =======================
     * CASE 2 — Model contains all supported actions
     * ======================= */
    try {
        const runtime = createRuntime("clockTower");
        const query = new ActionAvailabilityQuery();
        const model = query.buildModel(runtime);

        const types = model.actions.map(a => a.type);
        assert(types.includes(ActionType.ATTACK), "Case 2a: ATTACK present");
        assert(types.includes(ActionType.COLLECT), "Case 2b: COLLECT present");
        assert(types.includes(ActionType.END_TURN), "Case 2c: END_TURN present");
        assert(types.length === 3, "Case 2d: exactly 3 actions");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 2 threw: ${e.message}`);
        failed++;
    }

    /* =======================
     * CASE 3 — Disabled state reflected in model
     * ======================= */
    try {
        const runtime = createRuntime("clockTower");
        runtime.handleAction({ type: ActionType.ATTACK, playerId: "hero_1", payload: { target: "golem" }, id: "test1" });
        for (let i = 0; i < 9; i++) {
            runtime.handleAction({ type: ActionType.ATTACK, playerId: "hero_1", payload: { target: "golem" }, id: `test${i}` });
        }
        const query = new ActionAvailabilityQuery();
        const model = query.buildModel(runtime);
        const attack = model.actions.find(a => a.type === ActionType.ATTACK);
        assert(attack.enabled === false, "Case 3a: ATTACK disabled when bossHp=0");
        assert(attack.reason === "Boss defeated", "Case 3b: reason set");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 3 threw: ${e.message}`);
        failed++;
    }

    /* =======================
     * CASE 4 — Enabled state reflected in model
     * ======================= */
    try {
        const runtime = createRuntime("clockTower");
        const query = new ActionAvailabilityQuery();
        const model = query.buildModel(runtime);
        const attack = model.actions.find(a => a.type === ActionType.ATTACK);
        const collect = model.actions.find(a => a.type === ActionType.COLLECT);
        assert(attack.enabled === true, "Case 4a: ATTACK enabled initially");
        assert(collect.enabled === true, "Case 4b: COLLECT enabled initially");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 4 threw: ${e.message}`);
        failed++;
    }

    /* =======================
     * CASE 5 — Query Layer does not modify Runtime
     * ======================= */
    try {
        const runtime = createRuntime("puppetMaster");
        const initialState = runtime.state.serialize();
        const query = new ActionAvailabilityQuery();
        query.buildModel(runtime);
        const afterState = runtime.state.serialize();

        assert(JSON.stringify(initialState) === JSON.stringify(afterState), "Case 5: Runtime state unchanged after query");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 5 threw: ${e.message}`);
        failed++;
    }

    /* =======================
     * CASE 6 — Panel only sends PlayerAction via callback
     * ======================= */
    try {
        const runtime = createRuntime("puppetMaster");
        let capturedAction = null;

        const container = document.createElement("div");
        const panel = new ActionPanel({
            container,
            playerId: "hero_1",
            onAction: (action) => { capturedAction = action; }
        });

        const model = new ActionAvailabilityQuery().buildModel(runtime);
        panel.render(model);

        const destroyButton = container.querySelector("button");
        assert(destroyButton !== null, "Case 6a: button rendered");
        destroyButton.click();

        assert(capturedAction !== null, "Case 6b: onAction called");
        assert(capturedAction.type === ActionType.DESTROY, "Case 6c: correct action type");
        assert(capturedAction.playerId === "hero_1", "Case 6d: correct playerId");
        assert(typeof capturedAction.id === "string" && capturedAction.id.length > 0, "Case 6e: action has id");

        const validation = ActionValidator.validate(capturedAction);
        assert(validation.valid === true, "Case 6f: action passes validation");

        panel.destroy();
        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 6 threw: ${e.message}`);
        failed++;
    }

    /* =======================
     * CASE 7 — Panel does not hold Runtime reference
     * ======================= */
    try {
        const runtime = createRuntime("puppetMaster");
        const container = document.createElement("div");
        const panel = new ActionPanel({
            container,
            playerId: "hero_1",
            onAction: () => {}
        });

        const model = new ActionAvailabilityQuery().buildModel(runtime);
        panel.render(model);

        const panelKeys = Object.keys(panel);
        const hasRuntime = panelKeys.some(k => k.includes("runtime") || k.includes("Runtime"));
        assert(!hasRuntime, "Case 7: Panel has no runtime reference");

        panel.destroy();
        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 7 threw: ${e.message}`);
        failed++;
    }

    /* =======================
     * CASE 8 — Model is immutable
     * ======================= */
    try {
        const runtime = createRuntime("puppetMaster");
        const model = new ActionAvailabilityQuery().buildModel(runtime);

        let threw = false;
        try {
            model.actions.push({ type: ActionType.MOVE, enabled: true, reason: null });
        } catch (e) {
            threw = true;
        }
        assert(threw, "Case 8a: cannot push to actions array");

        threw = false;
        try {
            model.actions[0].enabled = false;
        } catch (e) {
            threw = true;
        }
        assert(threw, "Case 8b: cannot mutate action object");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 8 threw: ${e.message}`);
        failed++;
    }

    /* =======================
     * CASE 9 — HungryHouse availability logic
     * ======================= */
    try {
        const runtime = createRuntime("hungryHouse");
        const query = new ActionAvailabilityQuery();
        let model = query.buildModel(runtime);
        let move = model.actions.find(a => a.type === ActionType.MOVE);
        assert(move.enabled === true, "Case 9a: MOVE enabled initially");

        runtime.handleAction({ type: ActionType.MOVE, playerId: "hero_1", payload: { destination: "safeRoom" }, id: "test1" });
        model = query.buildModel(runtime);
        move = model.actions.find(a => a.type === ActionType.MOVE);
        assert(move.enabled === false, "Case 9b: MOVE disabled after reaching safe room");
        assert(move.reason === "Already in safe room", "Case 9c: reason set");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 9 threw: ${e.message}`);
        failed++;
    }

    /* =======================
     * CASE 10 — RitualOfShadows availability logic
     * ======================= */
    try {
        const runtime = createRuntime("ritualOfShadows");
        const query = new ActionAvailabilityQuery();
        let model = query.buildModel(runtime);
        let activate = model.actions.find(a => a.type === ActionType.ACTIVATE);
        assert(activate.enabled === true, "Case 10a: ACTIVATE enabled initially");

        runtime.handleAction({ type: ActionType.ACTIVATE, playerId: "hero_1", payload: { altar: "altarA" }, id: "t1" });
        runtime.handleAction({ type: ActionType.ACTIVATE, playerId: "hero_1", payload: { altar: "altarB" }, id: "t2" });
        runtime.handleAction({ type: ActionType.ACTIVATE, playerId: "hero_1", payload: { altar: "altarC" }, id: "t3" });
        model = query.buildModel(runtime);
        activate = model.actions.find(a => a.type === ActionType.ACTIVATE);
        assert(activate.enabled === false, "Case 10b: ACTIVATE disabled after all altars");
        assert(activate.reason === "Ritual complete", "Case 10c: reason set");

        runtime.destroy();
    } catch (e) {
        console.log(`[FAIL] Case 10 threw: ${e.message}`);
        failed++;
    }

    const elapsed = Date.now() - totalStart;
    console.log(`\n===== Presentation Rendering Test: ${passed} passed, ${failed} failed (${elapsed}ms) =====\n`);
}