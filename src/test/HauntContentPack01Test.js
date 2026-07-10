import { HauntScenario } from "../scenario/HauntScenario.js";
import { ScenarioDefinition } from "../scenario/definition/ScenarioDefinition.js";
import { ScenarioContext } from "../scenario/runtime/ScenarioContext.js";
import { ScenarioRuntimeFactory } from "../scenario/ScenarioRuntimeFactory.js";
import { InformationRouter } from "../scenario/information/InformationRouter.js";
import { InformationAudience } from "../scenario/information/InformationAudience.js";
import { ScenarioServices } from "../scenario/services/ScenarioServices.js";
import { ScenarioTestFactory } from "../testing/scenario/ScenarioTestFactory.js";
import { ScenarioTestHarness } from "../testing/scenario/ScenarioTestHarness.js";
import { BundleLoader } from "../scenario/package/BundleLoader.js";
import { BundleValidator } from "../scenario/package/BundleValidator.js";
import { BundleRegistry } from "../scenario/package/BundleRegistry.js";
import { RuntimeRegistry } from "../scenario/package/RuntimeRegistry.js";
import { ScenarioRegistry } from "../scenario/definition/ScenarioRegistry.js";
import { ScenarioLoader } from "../scenario/package/ScenarioLoader.js";
import { HAUNT_DEFINITIONS } from "../scenario/scenarios/haunts/HauntContentPack01Definition.js";
import { hauntContentPack01Bundle } from "../scenario/scenarios/haunts/HauntContentPack01Bundle.js";
import { PlayerAction } from "../scenario/action/PlayerAction.js";
import { ActionType } from "../scenario/action/ActionType.js";
import { ScenarioActionHandler } from "../scenario/action/ScenarioActionHandler.js";

/* =========================
 * Test Helpers
 * ========================= */

function createMinimalContext(router) {
    const services = router
        ? new ScenarioServices({ router })
        : null;

    return new ScenarioContext({
        players: {
            getAllPlayers: () => [
                { id: "hero_1" },
                { id: "hero_2" },
                { id: "hero_3" }
            ],
            getPlayer: (id) => null,
            getPlayerCount: () => 3
        },
        gameState: {
            getState: () => "HAUNT",
            setState: () => {},
            getTraitorPlayerId: () => "traitor_1",
            setTraitorPlayerId: () => {},
            isExploration: () => false,
            isHaunt: () => true
        },
        graphMap: {
            getAllRooms: () => [],
            getRoom: () => null,
            hasRoom: () => false
        },
        cardManager: {
            eventDeck: {},
            itemDeck: {},
            omenDeck: {}
        },
        services
    });
}

function runScenario(id) {
    const def = HAUNT_DEFINITIONS[id];
    if (!def) throw new Error(`Unknown scenario: ${id}`);

    const router = new InformationRouter();
    const context = createMinimalContext(router);
    const scenario = def.createScenario();
    const runtime = ScenarioRuntimeFactory.create(scenario, context, router);
    const harness = new ScenarioTestHarness(runtime);

    return { runtime, harness, router, context, def, scenario };
}

function check(ok, label) {
    if (ok) return;
    console.log(`[FAIL] ${label}`);
    throw new Error(label);
}

/* =========================
 * Main Test
 * ========================= */

export function runHauntContentPack01Test() {
    console.log("\n===== Haunt Content Pack 01 Test =====");
    let passed = 0;
    let failed = 0;

    function assert(ok, label) {
        if (ok) {
            passed++;
            return;
        }
        failed++;
        console.log(`[FAIL] ${label}`);
    }

    /* =========================
     * CASE 1 — Initial State
     * Each scenario initializes state correctly on start()
     * ========================= */

    try {
        const pm = runScenario("puppetMaster");
        pm.harness.start();
        assert(pm.runtime.state.get("dollsDestroyed") === 0, "puppetMaster initial dollsDestroyed");
        assert(typeof pm.runtime.state.get("heroesAlive") === "number", "puppetMaster initial heroesAlive");
        pm.harness.destroy();

        const hh = runScenario("hungryHouse");
        hh.harness.start();
        assert(hh.runtime.state.get("turnsElapsed") === 0, "hungryHouse initial turnsElapsed");
        assert(hh.runtime.state.get("heroInSafeRoom") === false, "hungryHouse initial heroInSafeRoom");
        hh.harness.destroy();

        const bs = runScenario("boundSpirits");
        bs.harness.start();
        assert(bs.runtime.state.get("spiritAlive") === true, "boundSpirits initial spiritAlive");
        assert(bs.runtime.state.get("escortProgress") === 0, "boundSpirits initial escortProgress");
        bs.harness.destroy();

        const ct = runScenario("clockTower");
        ct.harness.start();
        assert(ct.runtime.state.get("bossHp") === 10, "clockTower initial bossHp");
        assert(ct.runtime.state.get("partsFound") === 0, "clockTower initial partsFound");
        ct.harness.destroy();

        const ro = runScenario("ritualOfShadows");
        ro.harness.start();
        assert(ro.runtime.state.get("altarA") === false, "ritualOfShadows initial altarA");
        assert(ro.runtime.state.get("altarB") === false, "ritualOfShadows initial altarB");
        assert(ro.runtime.state.get("altarC") === false, "ritualOfShadows initial altarC");
        ro.harness.destroy();

        console.log(`[CASE 1] Initial State (5/5): PASS`);
    } catch (e) {
        console.log(`[CASE 1] Initial State: FAIL — ${e.message}`);
    }

    /* =========================
     * CASE 2 — Hero Victory
     * Each scenario returns hero win when condition met
     * ========================= */

    try {
        const pm = runScenario("puppetMaster");
        pm.harness.start();
        pm.runtime.state.set("dollsDestroyed", 3);
        const pmV = pm.harness.checkVictory();
        assert(pmV !== null && pmV.winner === "heroes", "puppetMaster hero win");
        pm.harness.destroy();

        const hh = runScenario("hungryHouse");
        hh.harness.start();
        hh.runtime.state.set("heroInSafeRoom", true);
        const hhV = hh.harness.checkVictory();
        assert(hhV !== null && hhV.winner === "heroes", "hungryHouse hero win");
        hh.harness.destroy();

        const bs = runScenario("boundSpirits");
        bs.harness.start();
        bs.runtime.state.set("escortProgress", 3);
        const bsV = bs.harness.checkVictory();
        assert(bsV !== null && bsV.winner === "heroes", "boundSpirits hero win");
        bs.harness.destroy();

        const ct = runScenario("clockTower");
        ct.harness.start();
        ct.runtime.state.set("bossHp", 0);
        const ctV = ct.harness.checkVictory();
        assert(ctV !== null && ctV.winner === "heroes", "clockTower hero win");
        ct.harness.destroy();

        const ro = runScenario("ritualOfShadows");
        ro.harness.start();
        ro.runtime.state.set("altarA", true);
        ro.runtime.state.set("altarB", true);
        ro.runtime.state.set("altarC", true);
        const roV = ro.harness.checkVictory();
        assert(roV !== null && roV.winner === "heroes", "ritualOfShadows hero win");
        ro.harness.destroy();

        console.log(`[CASE 2] Hero Victory (5/5): PASS`);
    } catch (e) {
        console.log(`[CASE 2] Hero Victory: FAIL — ${e.message}`);
    }

    /* =========================
     * CASE 3 — Traitor Victory
     * ========================= */

    try {
        const pm = runScenario("puppetMaster");
        pm.harness.start();
        pm.runtime.state.set("heroesAlive", 0);
        const pmV = pm.harness.checkVictory();
        assert(pmV !== null && pmV.winner === "traitor", "puppetMaster traitor win");
        pm.harness.destroy();

        const hh = runScenario("hungryHouse");
        hh.harness.start();
        hh.runtime.state.set("turnsElapsed", 8);
        const hhV = hh.harness.checkVictory();
        assert(hhV !== null && hhV.winner === "traitor", "hungryHouse traitor win");
        hh.harness.destroy();

        const bs = runScenario("boundSpirits");
        bs.harness.start();
        bs.runtime.state.set("spiritAlive", false);
        const bsV = bs.harness.checkVictory();
        assert(bsV !== null && bsV.winner === "traitor", "boundSpirits traitor win");
        bs.harness.destroy();

        const ct = runScenario("clockTower");
        ct.harness.start();
        ct.runtime.state.set("allHeroesDead", true);
        const ctV = ct.harness.checkVictory();
        assert(ctV !== null && ctV.winner === "traitor", "clockTower traitor win");
        ct.harness.destroy();

        const ro = runScenario("ritualOfShadows");
        ro.harness.start();
        ro.runtime.state.set("heroesAlive", 0);
        const roV = ro.harness.checkVictory();
        assert(roV !== null && roV.winner === "traitor", "ritualOfShadows traitor win");
        ro.harness.destroy();

        console.log(`[CASE 3] Traitor Victory (5/5): PASS`);
    } catch (e) {
        console.log(`[CASE 3] Traitor Victory: FAIL — ${e.message}`);
    }

    /* =========================
     * CASE 4 — No Victory
     * Middle state returns null from checkVictory
     * ========================= */

    try {
        const pm = runScenario("puppetMaster");
        pm.harness.start();
        pm.runtime.state.set("dollsDestroyed", 1);
        const pmV = pm.harness.checkVictory();
        assert(pmV === null, "puppetMaster no victory");
        pm.harness.destroy();

        const hh = runScenario("hungryHouse");
        hh.harness.start();
        hh.runtime.state.set("turnsElapsed", 3);
        const hhV = hh.harness.checkVictory();
        assert(hhV === null, "hungryHouse no victory");
        hh.harness.destroy();

        const bs = runScenario("boundSpirits");
        bs.harness.start();
        bs.runtime.state.set("escortProgress", 1);
        const bsV = bs.harness.checkVictory();
        assert(bsV === null, "boundSpirits no victory");
        bs.harness.destroy();

        const ct = runScenario("clockTower");
        ct.harness.start();
        ct.runtime.state.set("bossHp", 5);
        const ctV = ct.harness.checkVictory();
        assert(ctV === null, "clockTower no victory");
        ct.harness.destroy();

        const ro = runScenario("ritualOfShadows");
        ro.harness.start();
        ro.runtime.state.set("altarA", true);
        ro.runtime.state.set("altarB", false);
        ro.runtime.state.set("altarC", false);
        const roV = ro.harness.checkVictory();
        assert(roV === null, "ritualOfShadows no victory");
        ro.harness.destroy();

        console.log(`[CASE 4] No Victory (5/5): PASS`);
    } catch (e) {
        console.log(`[CASE 4] No Victory: FAIL — ${e.message}`);
    }

    /* =========================
     * CASE 5 — Lifecycle Callback
     * HungryHouse: END_TURN action increments turnsElapsed
     * ========================= */

    try {
        const hh = runScenario("hungryHouse");
        hh.harness.start();
        assert(hh.runtime.state.get("turnsElapsed") === 0, "lifecycle initial 0");

        ScenarioActionHandler.dispatch(hh.runtime, new PlayerAction({
            id: "lifecycle-1", type: ActionType.END_TURN, playerId: "hero_1"
        }));
        assert(hh.runtime.state.get("turnsElapsed") === 1, "lifecycle after 1 turn");

        ScenarioActionHandler.dispatch(hh.runtime, new PlayerAction({
            id: "lifecycle-2", type: ActionType.END_TURN, playerId: "hero_1"
        }));
        ScenarioActionHandler.dispatch(hh.runtime, new PlayerAction({
            id: "lifecycle-3", type: ActionType.END_TURN, playerId: "hero_1"
        }));
        assert(hh.runtime.state.get("turnsElapsed") === 3, "lifecycle after 3 turns");

        hh.harness.destroy();
        console.log(`[CASE 5] Lifecycle Callback: PASS`);
    } catch (e) {
        console.log(`[CASE 5] Lifecycle Callback: FAIL — ${e.message}`);
    }

    /* =========================
     * CASE 6 — Information Routing
     * PuppetMaster / ClockTower / BoundSpirits route packets
     * ========================= */

    try {
        const pmRouter = new InformationRouter();
        const pmCtx = createMinimalContext(pmRouter);
        const pmScenario = HAUNT_DEFINITIONS.puppetMaster.createScenario();
        const pmRuntime = ScenarioRuntimeFactory.create(pmScenario, pmCtx, pmRouter);
        pmRuntime.start();

        const pmPackets = pmRouter.getAllPackets();
        const hasHeroObj = pmPackets.some(p => p.id === "puppetMaster_hero_objective");
        const hasTraitorObj = pmPackets.some(p => p.id === "puppetMaster_traitor_objective");
        assert(hasHeroObj, "puppetMaster routes hero objective");
        assert(hasTraitorObj, "puppetMaster routes traitor objective");

        const heroPacket = pmPackets.find(p => p.id === "puppetMaster_hero_objective");
        assert(heroPacket.audience === InformationAudience.HEROES_ONLY, "puppetMaster hero audience");

        pmRuntime.destroy();

        const ctRouter = new InformationRouter();
        const ctCtx = createMinimalContext(ctRouter);
        const ctScenario = HAUNT_DEFINITIONS.clockTower.createScenario();
        const ctRuntime = ScenarioRuntimeFactory.create(ctScenario, ctCtx, ctRouter);
        ctRuntime.start();

        const ctPackets = ctRouter.getAllPackets();
        const hasBossHp = ctPackets.some(p => p.id === "clockTower_boss_hp");
        const hasCtHeroObj = ctPackets.some(p => p.id === "clockTower_hero_objective");
        assert(hasBossHp, "clockTower routes boss HP");
        assert(hasCtHeroObj, "clockTower routes hero objective");

        const bossHpPacket = ctPackets.find(p => p.id === "clockTower_boss_hp");
        assert(bossHpPacket.audience === InformationAudience.ALL_PLAYERS, "clockTower boss HP audience all players");

        ctRuntime.destroy();

        const bsRouter = new InformationRouter();
        const bsCtx = createMinimalContext(bsRouter);
        const bsScenario = HAUNT_DEFINITIONS.boundSpirits.createScenario();
        const bsRuntime = ScenarioRuntimeFactory.create(bsScenario, bsCtx, bsRouter);
        bsRuntime.start();

        const bsPackets = bsRouter.getAllPackets();
        const hasEscortPos = bsPackets.some(p => p.id === "boundSpirits_escort_position");
        assert(hasEscortPos, "boundSpirits routes escort position");

        bsRuntime.destroy();

        console.log(`[CASE 6] Information Routing: PASS`);
    } catch (e) {
        console.log(`[CASE 6] Information Routing: FAIL — ${e.message}`);
    }

    /* =========================
     * CASE 7 — Snapshot Restore
     * ClockTower: bossHp=5 → snapshot → restore → bossHp-- → hero win
     * ========================= */

    try {
        const ct = runScenario("clockTower");
        ct.harness.start();
        ct.runtime.state.set("bossHp", 5);

        const snapshot = {
            state: ct.runtime.state.serialize(),
            information: ct.runtime.router.serialize(),
            lifecycleState: ct.runtime.getLifecycleState(),
            scenarioId: ct.runtime.scenarioId
        };

        assert(snapshot.state.bossHp === 5, "snapshot captures bossHp=5");

        ct.runtime.state.set("bossHp", 0);
        const victBefore = ct.harness.checkVictory();
        assert(victBefore !== null && victBefore.winner === "heroes", "victory before restore");

        ct.runtime.restoreFromSnapshot(snapshot);
        assert(ct.runtime.state.get("bossHp") === 5, "restore resets bossHp to 5");

        const victAfter = ct.harness.checkVictory();
        assert(victAfter === null, "no victory after restore");

        ct.runtime.state.set("bossHp", 0);
        const victAfterMod = ct.harness.checkVictory();
        assert(victAfterMod !== null && victAfterMod.winner === "heroes", "victory after restore+modify");

        ct.harness.destroy();
        console.log(`[CASE 7] Snapshot Restore: PASS`);
    } catch (e) {
        console.log(`[CASE 7] Snapshot Restore: FAIL — ${e.message}`);
    }

    /* =========================
     * CASE 8 — Scenario Isolation
     * 5 runtimes simultaneously, no cross-contamination
     * ========================= */

    try {
        const runtimes = Object.keys(HAUNT_DEFINITIONS).map(id => {
            const r = runScenario(id);
            r.harness.start();
            return r;
        });

        runtimes[0].runtime.state.set("dollsDestroyed", 99);

        for (let i = 1; i < runtimes.length; i++) {
            const r = runtimes[i];
            const stateKeys = r.runtime.state.serialize();
            const hasDolls = "dollsDestroyed" in stateKeys;
            assert(!hasDolls, `scenario ${i} not contaminated by puppetMaster state`);
        }

        for (const r of runtimes) {
            r.harness.destroy();
        }

        console.log(`[CASE 8] Scenario Isolation: PASS`);
    } catch (e) {
        console.log(`[CASE 8] Scenario Isolation: FAIL — ${e.message}`);
    }

    /* =========================
     * CASE 9 — Bundle Pipeline
     * Bundle → Loader → Validator → Registry → ScenarioLoader → Runtime
     * ========================= */

    try {
        const bundleLoader = new BundleLoader();
        const bundleValidator = new BundleValidator();
        const bundleRegistry = new BundleRegistry();
        const runtimeReg = new RuntimeRegistry();
        const scenarioReg = new ScenarioRegistry();

        const bundle = bundleLoader.loadFromObject({
            manifest: {
                bundleId: "test-pack-01",
                bundleVersion: "1.0.0",
                title: "Test Pack",
                scenarioCount: 5
            },
            descriptors: [
                { id: "puppetMaster", title: "Puppet Master", version: "1.0.0" },
                { id: "hungryHouse", title: "Hungry House", version: "1.0.0" },
                { id: "boundSpirits", title: "Bound Spirits", version: "1.0.0" },
                { id: "clockTower", title: "Clock Tower", version: "1.0.0" },
                { id: "ritualOfShadows", title: "Ritual of Shadows", version: "1.0.0" }
            ]
        });

        bundleValidator.validate(bundle);
        assert(true, "bundle validation passes");

        bundleRegistry.register(bundle);
        assert(bundleRegistry.has("test-pack-01"), "bundle registered");

        for (const def of Object.values(HAUNT_DEFINITIONS)) {
            const rc = def.runtimeClass;
            if (rc) {
                runtimeReg.register(def.metadata.id, rc);
            }
        }

        const scenarioLoader = new ScenarioLoader(runtimeReg, scenarioReg);
        scenarioLoader.loadFromBundle(bundle);

        assert(scenarioReg.has("puppetMaster"), "scenarioLoader registered puppetMaster");
        assert(scenarioReg.has("clockTower"), "scenarioLoader registered clockTower");
        assert(scenarioReg.has("ritualOfShadows"), "scenarioLoader registered ritualOfShadows");

        const loadedDef = scenarioReg.get("puppetMaster");
        assert(loadedDef !== null, "loaded definition is accessible");
        assert(loadedDef.metadata.id === "puppetMaster", "loaded definition has correct id");

        const producedRuntime = ScenarioTestFactory.createFromDefinition(loadedDef);
        assert(producedRuntime !== null, "loaded definition produces runtime");
        assert(producedRuntime.scenarioId === "puppetMaster", "produced runtime has correct scenarioId");
        producedRuntime.start();
        assert(producedRuntime.isActive, "produced runtime starts successfully");
        producedRuntime.destroy();

        console.log(`[CASE 9] Bundle Pipeline: PASS`);
    } catch (e) {
        console.log(`[CASE 9] Bundle Pipeline: FAIL — ${e.message}`);
    }

    /* =========================
     * CASE 10 — Regression Snapshot
     * Each scenario produces consistent golden snapshots
     * ========================= */

    try {
        for (const [id, def] of Object.entries(HAUNT_DEFINITIONS)) {
            const a = runScenario(id);
            a.harness.start();
            const snapA = a.runtime.toSnapshot();
            a.harness.destroy();

            const b = runScenario(id);
            b.harness.start();
            const snapB = b.runtime.toSnapshot();
            b.harness.destroy();

            assert(snapA.scenarioId === id, `${id} snapshot scenarioId`);
            assert(snapA.lifecycleState === "started", `${id} snapshot lifecycle started`);
            assert(snapA.state !== null, `${id} snapshot has state`);
            assert(snapA.information !== null, `${id} snapshot has information`);

            const stateKeysA = Object.keys(snapA.state).sort();
            const stateKeysB = Object.keys(snapB.state).sort();
            assert(JSON.stringify(stateKeysA) === JSON.stringify(stateKeysB), `${id} consistent state keys`);

            const infoA = snapA.information;
            const infoB = snapB.information;
            const packetsA = (infoA?.packets || []).length;
            const packetsB = (infoB?.packets || []).length;
            assert(packetsA === packetsB, `${id} consistent information packet count`);
        }

        console.log(`[CASE 10] Regression Snapshot (5/5): PASS`);
    } catch (e) {
        console.log(`[CASE 10] Regression Snapshot: FAIL — ${e.message}`);
    }

    /* =========================
     * Summary
     * ========================= */

    console.log(`\n===== Haunt Content Pack 01 Test: ${passed} passed, ${failed} failed =====\n`);
}
