import { ScenarioContext } from "../scenario/runtime/ScenarioContext.js";
import { ScenarioRuntimeFactory } from "../scenario/ScenarioRuntimeFactory.js";
import { InformationRouter } from "../scenario/information/InformationRouter.js";
import { ScenarioServices } from "../scenario/services/ScenarioServices.js";
import { PlayerAction } from "../scenario/action/PlayerAction.js";
import { ScenarioActionHandler } from "../scenario/action/ScenarioActionHandler.js";
import { PLAYABLE_SCENARIO_PACK_01_DEFINITIONS } from "../scenario/scenarios/playable/PlayableScenarioPack01Definition.js";

class TestGameState {
    #traitorPlayerId = "traitor_1";

    getState() { return "HAUNT"; }
    setState() {}
    isExploration() { return false; }
    isHaunt() { return true; }
    getTraitorPlayerId() { return this.#traitorPlayerId; }
    setTraitorPlayerId(id) { this.#traitorPlayerId = id; }
}

class TestPlayers {
    #players;

    constructor(playerCount = 3) {
        const safeCount = Math.max(2, playerCount);
        const heroes = Array.from(
            { length: safeCount - 1 },
            (_, i) => ({ id: `hero_${i + 1}` })
        );

        this.#players = [
            ...heroes,
            { id: "traitor_1" }
        ];
    }

    getAllPlayers() { return [...this.#players]; }
    getPlayer(id) { return this.#players.find(p => p.id === id) || null; }
    getPlayerCount() { return this.#players.length; }
}

export function createPlayableRuntime(id, options = {}) {
    const def = PLAYABLE_SCENARIO_PACK_01_DEFINITIONS[id];
    if (!def) {
        throw new Error(`Unknown playable scenario: ${id}`);
    }

    const router = new InformationRouter();
    const context = new ScenarioContext({
        players: new TestPlayers(options.playerCount),
        gameState: new TestGameState(),
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

    const runtime = ScenarioRuntimeFactory.createFromDefinition(def, context, router);
    runtime.start();

    return { runtime, router, context, def };
}

export function dispatch(runtime, { id, type, playerId = "hero_1", payload = {} }) {
    return ScenarioActionHandler.dispatch(runtime, new PlayerAction({
        id,
        type,
        playerId,
        payload
    }));
}

export function endTurn(runtime, count = 1) {
    for (let i = 0; i < count; i++) {
        runtime.onTurnEnd();
    }
}

export function assertTest(assert, ok, label) {
    assert(ok, label);
}
