import { BundleValidator } from "../scenario/package/BundleValidator.js";
import { RuntimeRegistry } from "../scenario/package/RuntimeRegistry.js";
import { ScenarioRegistry } from "../scenario/definition/ScenarioRegistry.js";
import { ScenarioLoader } from "../scenario/package/ScenarioLoader.js";
import { ScenarioRuntimeFactory } from "../scenario/ScenarioRuntimeFactory.js";
import { InformationRouter } from "../scenario/information/InformationRouter.js";
import { ScenarioContext } from "../scenario/runtime/ScenarioContext.js";
import { ScenarioServices } from "../scenario/services/ScenarioServices.js";
import {
    PLAYABLE_SCENARIO_PACK_01_DEFINITIONS,
    PLAYABLE_SCENARIO_PACK_01_DEFINITIONS_LIST
} from "../scenario/scenarios/playable/PlayableScenarioPack01Definition.js";
import { playableScenarioPack01Bundle } from "../scenario/package/bundles/PlayableScenarioPack01Bundle.js";

function createContext(router) {
    return new ScenarioContext({
        players: {
            getAllPlayers: () => [{ id: "hero_1" }, { id: "traitor_1" }],
            getPlayer: () => null,
            getPlayerCount: () => 2
        },
        gameState: {
            getState: () => "HAUNT",
            setState: () => {},
            isExploration: () => false,
            isHaunt: () => true,
            getTraitorPlayerId: () => "traitor_1",
            setTraitorPlayerId: () => {}
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
        services: new ScenarioServices({ router })
    });
}

export function runPlayableScenarioPack01Test() {
    console.log("===== Playable Scenario Pack 01 Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => ok ? passed++ : (failed++, console.log("[FAIL]", label));

    try {
        assert(PLAYABLE_SCENARIO_PACK_01_DEFINITIONS_LIST.length === 5, "five definitions");
        assert(playableScenarioPack01Bundle.scenarioCount === 5, "five descriptors");

        const ids = PLAYABLE_SCENARIO_PACK_01_DEFINITIONS_LIST.map(def => def.metadata.id);
        assert(new Set(ids).size === 5, "unique definition ids");
        assert(ids.every(id => playableScenarioPack01Bundle.hasDescriptor(id)), "bundle contains all ids");
        assert(PLAYABLE_SCENARIO_PACK_01_DEFINITIONS_LIST.every(def =>
            def.metadata.title
            && def.metadata.description
            && def.objectives.heroes
            && def.objectives.traitor
        ), "metadata and objectives complete");

        new BundleValidator().validate(playableScenarioPack01Bundle);
        assert(true, "bundle validates");

        const runtimeRegistry = new RuntimeRegistry();
        const scenarioRegistry = new ScenarioRegistry();

        for (const def of PLAYABLE_SCENARIO_PACK_01_DEFINITIONS_LIST) {
            runtimeRegistry.register(def.metadata.id, def.runtimeClass);
        }

        const loader = new ScenarioLoader(runtimeRegistry, scenarioRegistry);
        loader.loadFromBundle(playableScenarioPack01Bundle);

        assert(ids.every(id => scenarioRegistry.has(id)), "scenario registry loaded");

        for (const id of ids) {
            const sourceDef = PLAYABLE_SCENARIO_PACK_01_DEFINITIONS[id];
            const router = new InformationRouter();
            const runtime = ScenarioRuntimeFactory.createFromDefinition(
                sourceDef,
                createContext(router),
                router
            );
            runtime.start();
            assert(runtime.scenarioId === id, `${id} runtime created`);
            assert(runtime.isActive === true, `${id} runtime active`);
            runtime.destroy();
        }
    } catch (e) {
        failed++;
        console.log("[FAIL] playable pack pipeline", e.message);
    }

    console.log(`===== Playable Scenario Pack 01 Test: ${passed} passed, ${failed} failed =====`);
}
