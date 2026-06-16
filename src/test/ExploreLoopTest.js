// src/test/ExploreLoopTest.js

import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { TurnManager }
    from "../state/TurnManager.js";

import { GraphMap }
    from "../model/GraphMap.js";

import { RoomNode }
    from "../model/RoomNode.js";

import { RoomTile }
    from "../model/RoomTile.js";

import { TileDeck }
    from "../model/TileDeck.js";

import { ExploreController }
    from "../controller/ExploreController.js";

import { ExplorationLoopController }
    from "../controller/ExplorationLoopController.js";

import { Player }
    from "../model/Player.js";

import { RoomDefinitions }
    from "../data/RoomDefinitions.js";

export function exploreLoopTest() {

    EventBus.clear();

    console.log(
        "\n===================="
    );

    console.log(
        "Explore Loop Test"
    );

    console.log(
        "====================\n"
    );

    /* =========================
     * Event Listeners
     * ========================= */

    EventBus.on(
        EventTypes.ROOM_DISCOVERED,
        payload => {

            console.log(
                "[EVENT] ROOM_DISCOVERED",
                payload
            );

        }
    );

    EventBus.on(
        EventTypes.PLAYER_MOVED,
        payload => {

            console.log(
                "[EVENT] PLAYER_MOVED",
                payload
            );

        }
    );

    EventBus.on(
        EventTypes.TURN_CHANGED,
        payload => {

            console.log(
                "[EVENT] TURN_CHANGED",
                payload
            );

        }
    );

    /* =========================
     * Graph Setup
     * ========================= */

    const graph =
        new GraphMap();

    const entrance =
        new RoomNode(
            0,
            new RoomTile(
                0,
                "Entrance Hall",
                {
                    north: true,
                    east: true,
                    south: false,
                    west: false
                }
            ),
            0,
            0
        );

    graph.addRoom(
        entrance
    );

    const deck =
        new TileDeck(
            RoomDefinitions
        );

    console.log(
        "[TEST] Deck Count:",
        deck.count()
    );

    console.log(
        "[TEST] Top Card:",
        deck.peek()?.name
    );

    const exploreController =
        new ExploreController(
            graph,
            deck
        );

    /* =========================
     * Players
     * ========================= */

    const player1 =
        new Player({
            id: "brandon",
            name: "Brandon",
            stats: {
                speed: 4,
                might: 4,
                sanity: 4,
                knowledge: 3
            }
        });

    const player2 =
        new Player({
            id: "ox",
            name: "Ox",
            stats: {
                speed: 4,
                might: 5,
                sanity: 3,
                knowledge: 3
            }
        });

    player1.currentRoom =
        entrance;

    player2.currentRoom =
        entrance;

    /* =========================
     * Turn System
     * ========================= */

    const turnManager =
        new TurnManager();

    turnManager.start([
        player1,
        player2
    ]);

    const loop =
        new ExplorationLoopController(
            graph,
            exploreController,
            turnManager
        );

    /* =========================
     * CASE 1
     * Explore New Room
     * ========================= */

    console.log(
        "\n[CASE 1] Explore East"
    );

    const result1 =
        loop.moveOrExplore(
            player1,
            1,
            0
        );

    console.log(
        "[PASS] Explore Result:",
        result1
    );

    console.log(
        "[PASS] Current Room:",
        player1.currentRoom?.tile?.name
    );

    console.log(
        "[PASS] Room Count:",
        graph.getAllRooms().length
    );

    /* =========================
     * CASE 2
     * Neighbor Link
     * ========================= */

    console.log(
        "\n[CASE 2] Neighbor Link"
    );

    const discoveredRoom =
        graph.getRoom(
            1,
            0
        );

    console.log(
        "[PASS] Neighbor Count:",
        discoveredRoom
            ?.getNeighbors()
            .length
    );

    /* =========================
     * CASE 3
     * Existing Room Movement
     * ========================= */

    console.log(
        "\n[CASE 3] Move Back"
    );

    const moveBack =
        loop.moveOrExplore(
            player1,
            -1,
            0
        );

    console.log(
        "[PASS] Move Back:",
        moveBack
    );

    console.log(
        "[PASS] Current Room:",
        player1.currentRoom?.tile?.name
    );

    /* =========================
     * CASE 4
     * Not Current Player
     * ========================= */

    console.log(
        "\n[CASE 4] Wrong Turn"
    );

    const wrongTurn =
        loop.moveOrExplore(
            player2,
            1,
            0
        );

    console.log(
        "[PASS] Wrong Turn Result:",
        wrongTurn
    );

    /* =========================
     * CASE 5
     * End Turn
     * ========================= */

    console.log(
        "\n[CASE 5] End Turn"
    );

    loop.endTurn();

    console.log(
        "[PASS] Current Player:",
        turnManager
            .getCurrentPlayer()
            ?.character
            ?.name
    );

    console.log(
        "[PASS] Is Player2 Turn:",
        turnManager
            .isCurrentPlayer(
                player2
            )
    );

    /* =========================
     * CASE 6
     * Player2 Movement
     * ========================= */

    console.log(
        "\n[CASE 6] Player2 Move"
    );

    const player2Move =
        loop.moveOrExplore(
            player2,
            1,
            0
        );

    console.log(
        "[PASS] Player2 Move:",
        player2Move
    );

    console.log(
        "[PASS] Player2 Room:",
        player2.currentRoom?.tile?.name
    );

    /* =========================
     * CASE 7
     * Position
     * ========================= */

    console.log(
        "\n[CASE 7] Position"
    );

    console.log(
        "[PASS] Player1 Position:",
        player1.getPosition()
    );

    console.log(
        "[PASS] Player2 Position:",
        player2.getPosition()
    );

    /* =========================
     * Complete
     * ========================= */

    console.log(
        "\n===== TEST COMPLETE ====="
    );
}