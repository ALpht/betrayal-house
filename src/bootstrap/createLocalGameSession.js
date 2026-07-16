import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";
import { GraphMap } from "../model/GraphMap.js";
import { RoomNode } from "../model/RoomNode.js";
import { RoomTile } from "../model/RoomTile.js";
import { PlayerManager } from "../model/PlayerManager.js";
import { CharacterFactory } from "../model/CharacterFactory.js";
import { CharacterDefinitions } from "../data/CharacterDefinitions.js";
import { RoomDefinitions } from "../data/RoomDefinitions.js";
import { EventDefinitions } from "../data/EventDefinitions.js";
import { ItemDefinitions } from "../data/ItemDefinitions.js";
import { OmenDefinitions } from "../data/OmenDefinitions.js";
import { createCard } from "../model/Card.js";
import { EventDeck } from "../model/EventDeck.js";
import { ItemDeck } from "../model/ItemDeck.js";
import { OmenDeck } from "../model/OmenDeck.js";
import { HauntTracker } from "../model/HauntTracker.js";
import { TurnManager } from "../state/TurnManager.js";
import { GameStateManager, GAME_STATE } from "../state/GameStateManager.js";
import { PlayerSpawnController } from "../controller/PlayerSpawnController.js";
import { ExploreController } from "../controller/ExploreController.js";
import { ExplorationLoopController } from "../controller/ExplorationLoopController.js";
import { FogOfWarController } from "../controller/FogOfWarController.js";
import { CardTriggerController } from "../controller/CardTriggerController.js";
import { CardInformationAdapter } from "../controller/CardInformationAdapter.js";
import { HauntTrackerController } from "../controller/HauntTrackerController.js";
import { HauntRollController } from "../controller/HauntRollController.js";
import { HauntManager } from "../controller/HauntManager.js";
import { TraitorAssignmentController } from "../controller/TraitorAssignmentController.js";
import { RandomTraitorRule } from "../traitor/RandomTraitorRule.js";
import { InformationRouter } from "../scenario/information/InformationRouter.js";
import { ScenarioContext } from "../scenario/runtime/ScenarioContext.js";
import { ScenarioRuntimeFactory } from "../scenario/ScenarioRuntimeFactory.js";
import { ScenarioServices } from "../scenario/services/ScenarioServices.js";
import { PLAYABLE_SCENARIO_PACK_01_DEFINITIONS } from "../scenario/scenarios/playable/PlayableScenarioPack01Definition.js";
import { ActionType } from "../scenario/action/ActionType.js";
import { ScenarioActionHandler } from "../scenario/action/ScenarioActionHandler.js";
import { PresentationController } from "../presentation/controller/PresentationController.js";
import { ActionPanel } from "../presentation/ActionPanel.js";
import { TurnPanel } from "../presentation/TurnPanel.js";
import { TurnPresentationQuery } from "../presentation/TurnPresentationQuery.js";
import { ActionAvailabilityQuery } from "../presentation/query/ActionAvailabilityQuery.js";
import { ScenarioPresentationQuery } from "../presentation/query/ScenarioPresentationQuery.js";
import { VictoryPresentationQuery } from "../presentation/query/VictoryPresentationQuery.js";
import { CardPresentationQuery } from "../presentation/query/CardPresentationQuery.js";
import { CardPanel } from "../presentation/panel/CardPanel.js";
import { ScenarioPanel } from "../presentation/panel/ScenarioPanel.js";
import { VictoryPanel } from "../presentation/panel/VictoryPanel.js";
import { CharacterPanel } from "../presentation/panel/CharacterPanel.js";
import { CharacterPresentationQuery } from "../presentation/query/CharacterPresentationQuery.js";
import { LocalActionInputAdapter } from "./LocalActionInputAdapter.js";

const DIRECTIONS = Object.freeze({
    north: [0, -1],
    east: [1, 0],
    south: [0, 1],
    west: [-1, 0]
});

class OrderedDeck {
    constructor(items = []) {
        this.items = [...items];
    }

    peek() { return this.items[0] || null; }
    draw() { return this.items.shift() || null; }
    isEmpty() { return this.items.length === 0; }
    count() { return this.items.length; }
    moveTopToBottom() {
        if (this.items.length > 1) {
            this.items.push(this.items.shift());
        }
    }
}

function makeContainer() {
    return {
        textContent: "",
        children: [],
        appendChild(child) { this.children.push(child); },
        removeChild(child) {
            this.children = this.children.filter(c => c !== child);
        }
    };
}

function makePresentationRuntime({ router, scenarioRuntime }) {
    if (scenarioRuntime) return scenarioRuntime;

    return {
        scenarioId: "local-exploration",
        router,
        getActionAvailability: () => [],
        getScenarioMetadata: () => ({
            id: "local-exploration",
            title: "Exploration",
            description: "Explore the house until the haunt begins.",
            difficulty: 1,
            objectives: { heroes: "Explore rooms and draw omen cards." }
        }),
        getVictoryResult: () => null
    };
}

function orderedRoomsForLocalPlay(roomDefinitions) {
    const omenRoom = roomDefinitions.find(r => r.triggerType === "omen");
    const eventRoom = roomDefinitions.find(r => r.triggerType === "event");
    const itemRoom = roomDefinitions.find(r => r.triggerType === "item");
    const rest = roomDefinitions.filter(r =>
        r !== omenRoom && r !== eventRoom && r !== itemRoom
    );

    return [omenRoom, eventRoom, itemRoom, ...rest].filter(Boolean);
}

export function createLocalGameSession({
    containers = {},
    characterIds = ["brandon", "ox"],
    roomDefinitions = RoomDefinitions,
    scenarioId = "relicEscape",
    hauntRule = { shouldTrigger: () => true },
    actionInputProvider = () => ({})
} = {}) {
    const state = {
        started: false,
        gameEnded: false,
        runtime: null,
        dispatchCount: 0,
        lastVictoryResult: null
    };

    const owned = {
        controllers: [],
        subscriptions: [],
        panels: [],
        presentation: null
    };

    const panelContainers = {
        turn: containers.turn || makeContainer(),
        character: containers.character || makeContainer(),
        action: containers.action || makeContainer(),
        scenario: containers.scenario || makeContainer(),
        card: containers.card || makeContainer(),
        victory: containers.victory || makeContainer(),
        status: containers.status || makeContainer()
    };

    const router = new InformationRouter();
    const graph = new GraphMap();
    const playerManager = new PlayerManager();
    const turnManager = new TurnManager();
    const hauntTracker = new HauntTracker();
    const eventDeck = new EventDeck(EventDefinitions.map(createCard));
    const itemDeck = new ItemDeck(ItemDefinitions.map(createCard));
    const omenDeck = new OmenDeck(OmenDefinitions.map(createCard));
    const tileDeck = new OrderedDeck(orderedRoomsForLocalPlay(roomDefinitions));
    const actionAdapter = new LocalActionInputAdapter({
        inputProvider: actionInputProvider
    });

    const currentViewerId = () => turnManager.getCurrentPlayer()?.id || null;
    const traitorId = () => GameStateManager.getTraitorPlayerId?.() || null;
    const currentRuntime = () => makePresentationRuntime({
        router,
        scenarioRuntime: state.runtime
    });

    function subscribe(event, handler) {
        EventBus.on(event, handler);
        owned.subscriptions.push([event, handler]);
    }

    function setStatus(message) {
        panelContainers.status.textContent = message;
    }

    function createEntrance() {
        const entrance = new RoomNode(
            0,
            new RoomTile(0, "Entrance Hall", {
                north: true,
                east: true,
                south: true,
                west: true
            }),
            0,
            0
        );

        entrance.tile.isRevealed = true;
        graph.addRoom(entrance);
        return entrance;
    }

    function createPlayers(entrance) {
        const uniqueIds = [...new Set(characterIds)].slice(0, 2);
        if (uniqueIds.length !== 2) {
            throw new Error("Local play requires two unique characters");
        }

        for (const id of uniqueIds) {
            const player = CharacterFactory.create(id);
            player.name = player.character.name;
            PlayerSpawnController.spawnPlayer(player, entrance);
            playerManager.addPlayer(player);
        }
    }

    function createScenarioRuntime(id) {
        const definition = PLAYABLE_SCENARIO_PACK_01_DEFINITIONS[id];
        if (!definition) {
            throw new Error(`Unknown local play scenario: ${id}`);
        }

        const context = new ScenarioContext({
            players: playerManager,
            gameState: GameStateManager,
            graphMap: graph,
            cardManager: { eventDeck, itemDeck, omenDeck },
            services: new ScenarioServices({ router })
        });

        const runtime = ScenarioRuntimeFactory.createFromDefinition(
            definition,
            context,
            router
        );

        runtime.start();
        state.runtime = runtime;
        GameStateManager.setState(GAME_STATE.HAUNT);

        EventBus.emit(EventTypes.SCENARIO_STARTED, {
            scenarioId: id,
            traitorRule: definition.traitorRule
        });
        EventBus.emit(EventTypes.SCENARIO_RUNTIME_CREATED, { scenarioId: id });
        EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, { scenarioId: id });
        setStatus(`Haunt started: ${id}`);

        return runtime;
    }

    function evaluateVictory() {
        if (!state.runtime || state.gameEnded) {
            return null;
        }

        const result = state.runtime.checkVictory();
        if (!result) {
            EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, {
                scenarioId: state.runtime.scenarioId
            });
            return null;
        }

        state.gameEnded = true;
        state.lastVictoryResult = result;
        EventBus.emit(
            EventTypes.GAME_ENDED,
            typeof result.toJSON === "function" ? result.toJSON() : result
        );
        setStatus(`Game ended: ${result.winner} (${result.reason})`);
        return result;
    }

    function createPresentation() {
        const actionPanel = new ActionPanel({
            container: panelContainers.action,
            playerId: "local-hot-seat",
            createAction: type => actionAdapter.createAction(
                type,
                currentViewerId()
            ),
            onAction: action => session.dispatchScenarioAction(action)
        });
        const panels = [
            actionPanel,
            new TurnPanel({ container: panelContainers.turn }),
            new CharacterPanel({ container: panelContainers.character }),
            new ScenarioPanel({ container: panelContainers.scenario }),
            new CardPanel({ container: panelContainers.card }),
            new VictoryPanel({ container: panelContainers.victory })
        ];
        owned.panels.push(...panels);

        const presentation = new PresentationController({
            runtimeProvider: currentRuntime,
            panels: new Map([
                ["action", {
                    query: new ActionAvailabilityQuery({
                        disabledProvider: () => state.gameEnded || !state.runtime
                    }),
                    panel: panels[0]
                }],
                ["turn", {
                    query: new TurnPresentationQuery({ turnManager }),
                    panel: panels[1]
                }],
                ["character", {
                    query: new CharacterPresentationQuery({ turnManager }),
                    panel: panels[2]
                }],
                ["scenario", {
                    query: new ScenarioPresentationQuery({
                        viewerProvider: currentViewerId,
                        traitorProvider: traitorId
                    }),
                    panel: panels[3]
                }],
                ["card", {
                    query: new CardPresentationQuery({
                        routerProvider: () => router,
                        viewerProvider: currentViewerId,
                        traitorProvider: traitorId
                    }),
                    panel: panels[4]
                }],
                ["victory", {
                    query: new VictoryPresentationQuery(),
                    panel: panels[5]
                }]
            ])
        });

        presentation.init();
        owned.presentation = presentation;
    }

    const session = {
        start() {
            if (state.started) return session;

            GameStateManager.setState(GAME_STATE.EXPLORATION);
            GameStateManager.setTraitorPlayerId(null);

            const entrance = createEntrance();
            createPlayers(entrance);

            const exploreController = new ExploreController(graph, tileDeck);
            const explorationLoop = new ExplorationLoopController(
                graph,
                exploreController,
                turnManager
            );

            owned.controllers.push(
                new FogOfWarController(graph),
                new CardTriggerController(graph, eventDeck, itemDeck, omenDeck),
                new CardInformationAdapter({ router }),
                new HauntTrackerController(hauntTracker),
                new HauntRollController(hauntRule),
                new HauntManager({ scenarioId }),
                new TraitorAssignmentController(
                    { random: () => new RandomTraitorRule() },
                    playerManager,
                    GameStateManager
                )
            );

            subscribe(EventTypes.HAUNT_TRIGGERED, payload => {
                if (!state.runtime) {
                    createScenarioRuntime(payload?.scenarioId || scenarioId);
                }
            });

            subscribe(EventTypes.CARD_DRAWN, () => {
                EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, {
                    scenarioId: state.runtime?.scenarioId || "local-exploration"
                });
            });

            subscribe(EventTypes.ROOM_REVEALED, () => {
                EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, {
                    scenarioId: state.runtime?.scenarioId || "local-exploration"
                });
            });

            session.explorationLoop = explorationLoop;
            turnManager.start(playerManager.getAllPlayers());
            createPresentation();

            state.started = true;
            setStatus("Local game started");
            EventBus.emit(EventTypes.GAME_STARTED, {
                playerCount: playerManager.getPlayerCount()
            });
            EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, {
                scenarioId: "local-exploration"
            });

            return session;
        },

        move(direction) {
            if (state.gameEnded) return false;
            const delta = DIRECTIONS[direction];
            if (!delta) return false;

            const player = turnManager.getCurrentPlayer();
            const moved = session.explorationLoop.moveOrExplore(
                player,
                delta[0],
                delta[1]
            );

            if (moved) {
                setStatus(`Moved ${direction}`);
            }

            return moved;
        },

        endTurn() {
            if (state.gameEnded) return false;
            turnManager.nextTurn();
            return true;
        },

        dispatchScenarioAction(action) {
            if (!state.runtime || state.gameEnded || !action) {
                return { success: false, error: "Scenario unavailable" };
            }

            if (action.type === ActionType.END_TURN) {
                session.endTurn();
                return { success: true };
            }

            state.dispatchCount++;
            const result = ScenarioActionHandler.dispatch(state.runtime, action);
            evaluateVictory();
            return result;
        },

        startScenario(id = scenarioId) {
            return state.runtime || createScenarioRuntime(id);
        },

        destroy() {
            if (state.runtime) {
                state.runtime.destroy();
            }

            if (owned.presentation) {
                owned.presentation.destroy();
            }

            for (const controller of owned.controllers) {
                controller.destroy?.();
            }

            for (const [event, handler] of owned.subscriptions) {
                EventBus.off(event, handler);
            }

            for (const panel of owned.panels) {
                panel.destroy?.();
            }

            state.runtime = null;
            state.started = false;
            owned.controllers = [];
            owned.subscriptions = [];
            owned.panels = [];
            owned.presentation = null;
            setStatus("");
        },

        getRuntime() { return state.runtime; },
        getRouter() { return router; },
        getGraph() { return graph; },
        getPlayerManager() { return playerManager; },
        getTurnManager() { return turnManager; },
        getCurrentPlayer() { return turnManager.getCurrentPlayer(); },
        getDispatchCount() { return state.dispatchCount; },
        getLastVictoryResult() { return state.lastVictoryResult; },
        getContainers() { return panelContainers; },
        isGameEnded() { return state.gameEnded; }
    };

    return session;
}
