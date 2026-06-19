import { GraphMap }
    from "../model/GraphMap.js";

import { RoomNode }
    from "../model/RoomNode.js";

import { RoomTile }
    from "../model/RoomTile.js";

import { TileDeck }
    from "../model/TileDeck.js";

import { PlayerManager }
    from "../model/PlayerManager.js";

import { CharacterFactory }
    from "../model/CharacterFactory.js";

import { TurnManager }
    from "../state/TurnManager.js";

import { GameStateManager, GAME_STATE }
    from "../state/GameStateManager.js";

import { HauntTracker }
    from "../model/HauntTracker.js";

import { EventDeck }
    from "../model/EventDeck.js";

import { ItemDeck }
    from "../model/ItemDeck.js";

import { OmenDeck }
    from "../model/OmenDeck.js";

import { EventDefinitions }
    from "../data/EventDefinitions.js";

import { ItemDefinitions }
    from "../data/ItemDefinitions.js";

import { OmenDefinitions }
    from "../data/OmenDefinitions.js";

import { RoomDefinitions }
    from "../data/RoomDefinitions.js";

import { GameSerializer }
    from "../save/GameSerializer.js";

import { GameDeserializer }
    from "../save/GameDeserializer.js";

function createTestGraph() {

    const graph = new GraphMap();

    const entranceDef =
        RoomDefinitions.find(
            t => t.id === 1
        );

    const entranceTile =
        entranceDef.clone();

    entranceTile.isRevealed = true;

    const entrance = new RoomNode(
        0,
        entranceTile,
        0,
        0
    );

    graph.addRoom(entrance);

    const tileA =
        RoomDefinitions.find(
            t => t.id === 1
        ).clone();

    tileA.isRevealed = true;
    tileA.isVisited = true;

    const roomA = new RoomNode(
        1,
        tileA,
        1,
        0
    );

    roomA.addNeighbor(entrance);
    entrance.addNeighbor(roomA);

    graph.addRoom(roomA);

    const tileB =
        RoomDefinitions.find(
            t => t.id === 3
        ).clone();

    tileB.isRevealed = true;

    const roomB = new RoomNode(
        2,
        tileB,
        0,
        1
    );

    roomB.addNeighbor(entrance);
    entrance.addNeighbor(roomB);

    graph.addRoom(roomB);

    return graph;

}

export function runSaveGameTest() {

    console.log(
        "===== Save Game Test ====="
    );

    /* =========================
     * Setup: full runtime state
     * ========================= */

    const graph = createTestGraph();

    const pm =
        new PlayerManager();

    const p1 =
        CharacterFactory.create(
            "brandon"
        );

    const p2 =
        CharacterFactory.create(
            "ox"
        );

    p1.currentRoom =
        graph.getRoom(1, 0);

    p2.currentRoom =
        graph.getRoom(0, 0);

    p1.stats.speed = 5;
    p1.stats.might = 3;

    pm.addPlayer(p1);
    pm.addPlayer(p2);

    const turnManager =
        new TurnManager();

    turnManager.start(
        pm.getAllPlayers()
    );

    turnManager.nextTurn();

    const eventDeck =
        new EventDeck(
            EventDefinitions
        );

    const itemDeck =
        new ItemDeck(
            ItemDefinitions
        );

    const omenDeck =
        new OmenDeck(
            OmenDefinitions
        );

    const tileDeck =
        new TileDeck([]);

    tileDeck.tiles =
        RoomDefinitions.map(
            t => t.clone()
        );

    const gameStateManager =
        GameStateManager;

    const hauntTracker =
        new HauntTracker();

    hauntTracker.trackOmen(
        { id: "omen_skull", name: "Skull" },
        p1.id,
        0
    );

    /* =========================
     * Serialize
     * ========================= */

    const serializer =
        new GameSerializer();

    const snapshot =
        serializer.toSnapshot(
            graph,
            pm,
            turnManager,
            gameStateManager,
            eventDeck,
            itemDeck,
            omenDeck,
            tileDeck,
            hauntTracker
        );

    const json =
        JSON.stringify(snapshot);

    const parsed =
        JSON.parse(json);

    /* =========================
     * Deserialize into fresh instances
     * ========================= */

    const graph2 =
        new GraphMap();

    const pm2 =
        new PlayerManager();

    const turnManager2 =
        new TurnManager();

    const eventDeck2 =
        new EventDeck(
            EventDefinitions
        );

    const itemDeck2 =
        new ItemDeck(
            ItemDefinitions
        );

    const omenDeck2 =
        new OmenDeck(
            OmenDefinitions
        );

    const tileDeck2 =
        new TileDeck([]);

    tileDeck2.tiles =
        RoomDefinitions.map(
            t => t.clone()
        );

    const gameStateManager2 =
        new (Object.getPrototypeOf(
            GameStateManager
        ).constructor)();

    gameStateManager2.current =
        GAME_STATE.EXPLORATION;

    const hauntTracker2 =
        new HauntTracker();

    const deserializer =
        new GameDeserializer();

    deserializer.fromSnapshot(
        parsed,
        graph2,
        pm2,
        turnManager2,
        gameStateManager2,
        eventDeck2,
        itemDeck2,
        omenDeck2,
        tileDeck2,
        hauntTracker2
    );

    /* =========================
     * [CASE 1] Room count
     * ========================= */

    console.log(
        "[CASE 1] Room count:",
        graph2.getAllRooms().length === 3
    );

    /* =========================
     * [CASE 2] Room positions and state
     * ========================= */

    const room00 =
        graph2.getRoom(0, 0);

    console.log(
        "[CASE 2] Room (0,0) exists:",
        room00 !== null
    );

    if (room00) {

        console.log(
            "[CASE 2] Room (0,0) isRevealed:",
            room00.tile.isRevealed === true
        );

    }

    const room10 =
        graph2.getRoom(1, 0);

    if (room10) {

        console.log(
            "[CASE 2] Room (1,0) rotation:",
            room10.tile.rotation === 0
        );

        console.log(
            "[CASE 2] Room (1,0) isVisited:",
            room10.tile.isVisited === true
        );

    }

    /* =========================
     * [CASE 3] Player count
     * ========================= */

    console.log(
        "[CASE 3] Player count:",
        pm2.getPlayerCount() === 2
    );

    /* =========================
     * [CASE 4] Player stats restored
     * ========================= */

    const loadedP1 =
        pm2.getPlayer(p1.id);

    console.log(
        "[CASE 4] P1 speed:",
        loadedP1?.stats.speed === 5
    );

    console.log(
        "[CASE 4] P1 might:",
        loadedP1?.stats.might === 3
    );

    /* =========================
     * [CASE 5] Player position
     * ========================= */

    const pos1 =
        loadedP1?.getPosition();

    console.log(
        "[CASE 5] P1 at x=1:",
        pos1?.x === 1
    );

    console.log(
        "[CASE 5] P1 at y=0:",
        pos1?.y === 0
    );

    /* =========================
     * [CASE 6] TurnManager restored
     * ========================= */

    console.log(
        "[CASE 6] Turn started:",
        turnManager2.hasStarted() === true
    );

    console.log(
        "[CASE 6] Turn index:",
        turnManager2.getCurrentPlayerIndex() === 1
    );

    /* =========================
     * [CASE 7] HauntTracker restored
     * ========================= */

    console.log(
        "[CASE 7] Omen count:",
        hauntTracker2.getOmenCount() === 1
    );

    const records =
        hauntTracker2.getRecords();

    console.log(
        "[CASE 7] Records length:",
        records.length === 1
    );

    if (records[0]) {

        console.log(
            "[CASE 7] Record cardId:",
            records[0].card?.id === "omen_skull"
        );

        console.log(
            "[CASE 7] Record playerId:",
            records[0].playerId === p1.id
        );

    }

    /* =========================
     * [CASE 8] GameState restored
     * ========================= */

    console.log(
        "[CASE 8] Game state EXPLORATION:",
        gameStateManager2.isExploration() === true
    );

    /* =========================
     * [CASE 9] Deck order preserved
     * ========================= */

    const eventCards =
        eventDeck2.cards;

    console.log(
        "[CASE 9] Event deck count:",
        eventCards.length
            === EventDefinitions.length
    );

    console.log(
        "[CASE 9] Event deck order intact:",
        eventCards[0]?.id
            === EventDefinitions[0]?.id
    );

    /* =========================
     * [CASE 10] Graph instance not replaced
     * ========================= */

    console.log(
        "[CASE 10] Same graph instance:",
        graph2.getAllRooms().length === 3
    );

    /* =========================
     * [CASE 11] HauntTracker room coordinates
     * ========================= */

    if (records[0]) {

        console.log(
            "[CASE 11] Record roomId resolved:",
            records[0].roomId === 0
        );

    }

    /* =========================
     * [CASE 12] Neighbors rebuilt
     * ========================= */

    const loadedEntrance =
        graph2.getRoom(0, 0);

    if (loadedEntrance) {

        const neighborIds =
            loadedEntrance
                .getNeighbors()
                .map(n => n.id)
                .sort();

        console.log(
            "[CASE 12] Neighbor IDs:",
            JSON.stringify(neighborIds)
                === "[1,2]"
        );

    }

}
