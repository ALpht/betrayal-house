import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";
import { PresentationController } from "../presentation/controller/PresentationController.js";
import { ScenarioPresentationQuery } from "../presentation/query/ScenarioPresentationQuery.js";
import { ScenarioPresentationModel } from "../presentation/model/ScenarioPresentationModel.js";
import { ScenarioPanel } from "../presentation/panel/ScenarioPanel.js";
import { ScenarioRuntimeFactory } from "../scenario/ScenarioRuntimeFactory.js";
import { ScenarioContext } from "../scenario/runtime/ScenarioContext.js";
import { ScenarioServices } from "../scenario/services/ScenarioServices.js";
import { InformationRouter } from "../scenario/information/InformationRouter.js";
import { InformationPacket } from "../scenario/information/InformationPacket.js";
import { InformationAudience } from "../scenario/information/InformationAudience.js";
import { InformationScope } from "../scenario/information/InformationScope.js";
import { HAUNT_DEFINITIONS } from "../scenario/scenarios/haunts/HauntContentPack01Definition.js";
import { ActionAvailabilityQuery } from "../presentation/query/ActionAvailabilityQuery.js";
import { TurnPresentationQuery } from "../presentation/TurnPresentationQuery.js";
import { VictoryPresentationQuery } from "../presentation/query/VictoryPresentationQuery.js";

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
    players.addPlayer({ id: "hero_1", name: "Alice" });
    players.addPlayer({ id: "traitor_1", name: "Bob" });
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

export function runScenarioPresentationTest() {
    console.log("\n===== Scenario Presentation Test =====");
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
     * CASE 1 — ScenarioPresentationModel immutable
     * ========================= */
    {
        const model = new ScenarioPresentationModel({
            scenarioName: "Test",
            objectiveText: "Do stuff",
            visibleInfo: [{ id: "p1", scope: "objective", payload: { text: "hi" } }]
        });

        assert(model.scenarioName === "Test", "Case 1a: scenarioName readable");
        assert(model.objectiveText === "Do stuff", "Case 1b: objectiveText readable");
        assert(model.visibleInfo.length === 1, "Case 1c: visibleInfo readable");

        let threw = false;
        try { model.scenarioName = "Changed"; } catch { threw = true; }
        assert(threw, "Case 1d: scenarioName immutable");

        threw = false;
        try { model.visibleInfo.push({ id: "x" }); } catch { threw = true; }
        assert(threw, "Case 1e: visibleInfo array immutable");
    }

    /* =========================
     * CASE 2 — Query builds correct Model from Runtime
     * ========================= */
    {
        const runtime = createRuntime("puppetMaster");
        const query = new ScenarioPresentationQuery();
        const model = query.buildModel(runtime);

        assert(model instanceof ScenarioPresentationModel, "Case 2a: returns ScenarioPresentationModel");
        assert(model.scenarioName === "The Puppet Master", "Case 2b: scenarioName from metadata");
        assert(typeof model.objectiveText === "string" && model.objectiveText.length > 0, "Case 2c: objectiveText present");

        runtime.destroy();
    }

    /* =========================
     * CASE 3 — InformationRouter visibility filtering
     * Heroes see hero objective, traitor sees traitor objective
     * ========================= */
    {
        const runtime = createRuntime("clockTower");

        const heroQuery = new ScenarioPresentationQuery();
        const heroModel = heroQuery.buildModel(runtime);

        assert(heroModel.scenarioName === "The Clock Tower", "Case 3a: hero sees scenario name");
        assert(
            heroModel.objectiveText.includes("Golem") || heroModel.objectiveText.includes("Defeat"),
            "Case 3b: hero sees hero objective"
        );

        runtime.destroy();
    }

    /* =========================
     * CASE 4 — Query does not modify Runtime
     * ========================= */
    {
        const runtime = createRuntime("puppetMaster");
        const stateBefore = runtime.state.serialize();

        const query = new ScenarioPresentationQuery();
        query.buildModel(runtime);

        const stateAfter = runtime.state.serialize();
        assert(
            JSON.stringify(stateBefore) === JSON.stringify(stateAfter),
            "Case 4: Runtime state unchanged after buildModel"
        );

        runtime.destroy();
    }

    /* =========================
     * CASE 5 — ScenarioPanel has no Runtime reference
     * ========================= */
    {
        const container = { textContent: "" };
        const panel = new ScenarioPanel({ container });

        const panelKeys = Object.getOwnPropertyNames(panel);
        const hasRuntime = panelKeys.some(k =>
            k.toLowerCase().includes("runtime")
        );
        assert(!hasRuntime, "Case 5: ScenarioPanel has no Runtime reference");
    }

    /* =========================
     * CASE 6 — ScenarioPanel does not subscribe to EventBus
     * ========================= */
    {
        const container = { textContent: "" };
        const panel = new ScenarioPanel({ container });

        const panelKeys = Object.getOwnPropertyNames(panel);
        const hasEventBus = panelKeys.some(k =>
            k.toLowerCase().includes("eventbus") || k.toLowerCase().includes("subscribe")
        );
        assert(!hasEventBus, "Case 6: ScenarioPanel has no EventBus reference");
    }

    /* =========================
     * CASE 7 — ScenarioPanel renders Model correctly
     * ========================= */
    {
        const container = { textContent: "" };
        const panel = new ScenarioPanel({ container });

        const model = new ScenarioPresentationModel({
            scenarioName: "The Puppet Master",
            objectiveText: "Destroy 3 dolls.",
            visibleInfo: [
                { id: "boss_hp", scope: "scenario", payload: { text: "Boss HP: 10" } },
                { id: "hero_obj", scope: "objective", payload: { text: "Secret" } }
            ]
        });

        panel.render(model);

        assert(container.textContent.includes("The Puppet Master"), "Case 7a: renders scenario name");
        assert(container.textContent.includes("Destroy 3 dolls"), "Case 7b: renders objective");
        assert(container.textContent.includes("Boss HP: 10"), "Case 7c: renders scenario scope info");
        assert(!container.textContent.includes("Secret"), "Case 7d: does not render objective scope info");

        panel.destroy();
        assert(container.textContent === "", "Case 7e: destroy clears container");
    }

    /* =========================
     * CASE 8 — Runtime getScenarioMetadata() returns correct shape
     * ========================= */
    {
        const runtime = createRuntime("puppetMaster");
        const metadata = runtime.getScenarioMetadata();

        assert(metadata.id === "puppetMaster", "Case 8a: id correct");
        assert(metadata.title === "The Puppet Master", "Case 8b: title correct");
        assert(metadata.description.length > 0, "Case 8c: description present");
        assert(typeof metadata.difficulty === "number", "Case 8d: difficulty is number");
        assert(
            metadata.objectives !== null &&
            typeof metadata.objectives.heroes === "string",
            "Case 8e: objectives.heroes present"
        );

        runtime.destroy();
    }

    /* =========================
     * CASE 9 — Runtime getVictoryResult() is null before checkVictory
     * ========================= */
    {
        const runtime = createRuntime("puppetMaster");

        assert(runtime.getVictoryResult() === null, "Case 9: getVictoryResult null before check");

        runtime.destroy();
    }

    const elapsed = Date.now() - totalStart;
    console.log(`\n===== Scenario Presentation Test: ${passed} passed, ${failed} failed (${elapsed}ms) =====\n`);
}
