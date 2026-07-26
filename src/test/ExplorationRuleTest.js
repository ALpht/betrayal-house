import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";
import { RoomNode } from "../model/RoomNode.js";
import { RoomTile } from "../model/RoomTile.js";
import { TileDeck } from "../model/TileDeck.js";
import { createLocalGameSession } from "../bootstrap/createLocalGameSession.js";
import { ActionFactory } from "../presentation/ActionFactory.js";
import { installTestDom } from "./TestDom.js";

function createContainers() {
    return {
        turn: document.createElement("pre"),
        character: document.createElement("pre"),
        action: document.createElement("div"),
        scenario: document.createElement("pre"),
        card: document.createElement("pre"),
        victory: document.createElement("pre"),
        status: document.createElement("pre")
    };
}

function room(id, triggerType, exits) {
    return new RoomTile(id, `Room ${id}`, exits, triggerType);
}

export function runExplorationRuleTest() {
    installTestDom();
    console.log("\n===== Exploration Rule Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        const deck = new TileDeck([
            room("event-room", "event", {
                north: true, east: false, south: false, west: false
            })
        ], { random: () => 0.999999 });
        const session = createLocalGameSession({
            containers: createContainers(),
            characterIds: ["brandon", "ox"],
            tileDeck: deck,
            hauntRule: { shouldTrigger: () => false }
        }).start();
        const firstPlayer = session.getCurrentPlayer();
        const availabilityBefore =
            session.explorationActionHandler.getDirectionAvailability(
                firstPlayer.id
            );
        const east = availabilityBefore.find(action =>
            action.payload.direction === "east"
        );
        let revealCount = 0;
        let cardCount = 0;
        let turnCount = 0;
        const onReveal = () => revealCount++;
        const onCard = () => cardCount++;
        const onTurn = () => turnCount++;
        EventBus.on(EventTypes.ROOM_REVEALED, onReveal);
        EventBus.on(EventTypes.CARD_DRAWN, onCard);
        EventBus.on(EventTypes.TURN_CHANGED, onTurn);

        const moved = session.move("east");
        const roomCount = session.getGraph().getAllRooms().length;
        const nextPlayer = session.getCurrentPlayer();
        const revealedRoom = session.getGraph().getRoom(1, 0);

        assert(
            east.enabled &&
                moved &&
                roomCount === 2 &&
                revealedRoom?.tile.isRevealed === true &&
                revealCount === 1 &&
                cardCount === 1 &&
                turnCount === 1 &&
                nextPlayer.id !== firstPlayer.id,
            "Case 1: Unknown direction reveals, triggers one card, and ends the turn"
        );

        revealCount = 0;
        cardCount = 0;
        turnCount = 0;
        const knownMove = session.move("east");
        assert(
            knownMove &&
                session.getCurrentPlayer().id === nextPlayer.id &&
                nextPlayer.currentRoom === revealedRoom &&
                deck.count() === 0 &&
                revealCount === 0 &&
                cardCount === 0 &&
                turnCount === 0,
            "Case 2: Connected-room movement does not redraw, reveal, or end turn"
        );

        EventBus.off(EventTypes.ROOM_REVEALED, onReveal);
        EventBus.off(EventTypes.CARD_DRAWN, onCard);
        EventBus.off(EventTypes.TURN_CHANGED, onTurn);
        session.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Exploration flow threw", error.message);
    }

    try {
        const deck = new TileDeck([
            room("closed", null, {
                north: false, east: false, south: false, west: false
            })
        ], { random: () => 0.999999 });
        const session = createLocalGameSession({
            containers: createContainers(),
            tileDeck: deck,
            hauntRule: { shouldTrigger: () => false }
        }).start();
        const player = session.getCurrentPlayer();
        const deckOrder = deck.getRemainingTiles().map(tile => tile.id);
        const graphCount = session.getGraph().getAllRooms().length;
        let eventCount = 0;
        const onAny = () => eventCount++;
        EventBus.on(EventTypes.ROOM_DISCOVERED, onAny);
        EventBus.on(EventTypes.PLAYER_MOVED, onAny);
        EventBus.on(EventTypes.ROOM_REVEALED, onAny);

        const firstAvailability =
            session.explorationActionHandler.getDirectionAvailability(player.id);
        const secondAvailability =
            session.explorationActionHandler.getDirectionAvailability(player.id);
        const rejected = session.move("east");

        assert(
            JSON.stringify(firstAvailability) === JSON.stringify(secondAvailability) &&
                firstAvailability.find(action =>
                    action.payload.direction === "east"
                ).enabled === false &&
                rejected === false &&
                JSON.stringify(deck.getRemainingTiles().map(tile => tile.id)) ===
                    JSON.stringify(deckOrder) &&
                session.getGraph().getAllRooms().length === graphCount &&
                player.currentRoom.id === 0 &&
                eventCount === 0,
            "Case 3: Availability and failed full-deck exploration are zero-mutation"
        );

        EventBus.off(EventTypes.ROOM_DISCOVERED, onAny);
        EventBus.off(EventTypes.PLAYER_MOVED, onAny);
        EventBus.off(EventTypes.ROOM_REVEALED, onAny);
        session.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Failed planning flow threw", error.message);
    }

    try {
        const deck = new TileDeck([
            room("omen-room", "omen", {
                north: true, east: false, south: false, west: false
            })
        ], { random: () => 0.999999 });
        const session = createLocalGameSession({
            containers: createContainers(),
            tileDeck: deck,
            scenarioId: "relicEscape",
            hauntRule: { shouldTrigger: () => true }
        }).start();
        const revealer = session.getCurrentPlayer();
        let turnChanges = 0;
        const onTurn = () => turnChanges++;
        EventBus.on(EventTypes.TURN_CHANGED, onTurn);
        const result = session.executeAuthoritativeAction(
            ActionFactory.createMove(revealer.id, { direction: "east" })
        );

        assert(
            result.accepted &&
                result.resolution?.hauntTriggered === true &&
                result.resolution?.runtimeCreated === true &&
                result.resolution?.turnResolvedByHauntLifecycle === false &&
                session.getRuntime()?.scenarioId === "relicEscape" &&
                session.getCurrentPlayer().id !== revealer.id &&
                turnChanges === 1,
            "Case 4: Haunt reveal creates Runtime and advances the turn exactly once"
        );

        EventBus.off(EventTypes.TURN_CHANGED, onTurn);
        session.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Haunt turn resolution threw", error.message);
    }

    try {
        const deck = new TileDeck([
            room("all-doors", null, {
                north: true, east: true, south: true, west: true
            })
        ], { random: () => 0.999999 });
        const session = createLocalGameSession({
            containers: createContainers(),
            characterIds: ["brandon", "ox"],
            tileDeck: deck,
            hauntRule: { shouldTrigger: () => false }
        }).start();
        const graph = session.getGraph();
        const entrance = graph.getRoom(0, 0);
        const northNeighbor = new RoomNode(
            20,
            room("north-neighbor", null, {
                north: false, east: false, south: true, west: false
            }),
            1,
            -1
        );
        const southWall = new RoomNode(
            21,
            room("south-wall", null, {
                north: false, east: false, south: false, west: false
            }),
            1,
            1
        );
        graph.addRoom(northNeighbor);
        graph.addRoom(southWall);

        const moved = session.move("east");
        const revealed = graph.getRoom(1, 0);
        assert(
            moved &&
                revealed.getNeighbors().includes(entrance) &&
                revealed.getNeighbors().includes(northNeighbor) &&
                northNeighbor.getNeighbors().includes(revealed) &&
                !revealed.getNeighbors().includes(southWall) &&
                !southWall.getNeighbors().includes(revealed),
            "Case 5: Reveal creates edges only where both touching rooms have doors"
        );
        session.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Reciprocal edge flow threw", error.message);
    }

    try {
        const session = createLocalGameSession({
            containers: createContainers(),
            characterIds: ["brandon", "ox"],
            tileDeck: new TileDeck([
                room("open", null, {
                    north: true, east: true, south: true, west: true
                })
            ], { random: () => 0.999999 }),
            hauntRule: { shouldTrigger: () => false }
        }).start();
        const graph = session.getGraph();
        const currentPlayer = session.getCurrentPlayer();
        const waitingPlayer = session.getPlayerManager()
            .getAllPlayers()
            .find(player => player.id !== currentPlayer.id);
        const entrance = graph.getRoom(0, 0);
        entrance.tile.exits.north = false;
        const blockingRoom = new RoomNode(
            22,
            room("blocked", null, {
                north: true, east: true, south: true, west: false
            }),
            1,
            0
        );
        graph.addRoom(blockingRoom);
        const wall = session.explorationRule.getDirectionAvailability(
            currentPlayer,
            "north"
        );
        const blocked = session.explorationRule.getDirectionAvailability(
            currentPlayer,
            "east"
        );
        const beforeDeck = session.getTileDeck().getRemainingTiles()
            .map(tile => tile.id);
        const wrongTurn = session.executeAuthoritativeAction(
            ActionFactory.createMove(waitingPlayer.id, { direction: "south" })
        );
        const invalid = session.executeAuthoritativeAction(
            ActionFactory.createMove(currentPlayer.id, { direction: "diagonal" })
        );

        assert(
            wall.topology === "WALL" &&
                !wall.enabled &&
                blocked.topology === "BLOCKED" &&
                !blocked.enabled &&
                wrongTurn.reasonCode === "NOT_CURRENT_PLAYER" &&
                !wrongTurn.accepted &&
                !invalid.accepted &&
                JSON.stringify(
                    session.getTileDeck().getRemainingTiles().map(tile => tile.id)
                ) === JSON.stringify(beforeDeck) &&
                currentPlayer.currentRoom === entrance &&
                waitingPlayer.currentRoom === entrance,
            "Case 6: Wall, blocked, wrong-turn, and invalid-direction actions reject without mutation"
        );
        session.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Direction rejection flow threw", error.message);
    }

    try {
        const session = createLocalGameSession({
            containers: createContainers(),
            characterIds: ["brandon", "ox"],
            tileDeck: new TileDeck([
                room("event-room", "event", {
                    north: true, east: false, south: false, west: false
                })
            ], { random: () => 0.999999 }),
            hauntRule: { shouldTrigger: () => false }
        }).start();
        const revealer = session.getCurrentPlayer();
        session.explorationRule.turnResolutionTracker = {
            track(operation) {
                return {
                    value: operation(),
                    resolution: {
                        hauntTriggered: true,
                        runtimeCreated: true,
                        turnResolvedByHauntLifecycle: true
                    }
                };
            }
        };
        let turnChanges = 0;
        const onTurn = () => turnChanges++;
        EventBus.on(EventTypes.TURN_CHANGED, onTurn);
        const result = session.executeAuthoritativeAction(
            ActionFactory.createMove(revealer.id, { direction: "east" })
        );

        assert(
            result.accepted &&
                result.resolution.turnResolvedByHauntLifecycle &&
                session.getCurrentPlayer() === revealer &&
                turnChanges === 0,
            "Case 7: A Haunt lifecycle-owned turn prevents a second turn advance"
        );
        EventBus.off(EventTypes.TURN_CHANGED, onTurn);
        session.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Lifecycle-owned turn flow threw", error.message);
    }

    try {
        const session = createLocalGameSession({
            containers: createContainers(),
            characterIds: ["brandon", "ox"],
            tileDeck: new TileDeck([
                room("item-room", "item", {
                    north: true, east: false, south: false, west: false
                })
            ], { random: () => 0.999999 }),
            hauntRule: { shouldTrigger: () => false }
        }).start();
        let itemDraws = 0;
        const onCard = payload => {
            if (payload?.card?.type === "item") {
                itemDraws++;
            }
        };
        EventBus.on(EventTypes.CARD_DRAWN, onCard);
        const moved = session.move("east");

        assert(
            moved && itemDraws === 1,
            "Case 8: Item room reveal enters the existing card pipeline exactly once"
        );
        EventBus.off(EventTypes.CARD_DRAWN, onCard);
        session.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Item reveal flow threw", error.message);
    }

    console.log(
        `===== Exploration Rule Test: ${passed} passed, ${failed} failed =====\n`
    );
}
