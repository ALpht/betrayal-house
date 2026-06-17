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

import { FogOfWarController }
    from "../controller/FogOfWarController.js";

import { Player }
    from "../model/Player.js";

import { RoomDefinitions }
    from "../data/RoomDefinitions.js";

export function fogOfWarTest() {

    EventBus.clear();

    console.log(
        "\n===================="
    );

    console.log(
        "Fog Of War Test"
    );

    console.log(
        "====================\n"
    );

    let revealEvents = 0;
    let lastRevealPayload = null;

    EventBus.on(
        EventTypes.ROOM_REVEALED,
        payload => {
            revealEvents++;
            lastRevealPayload = payload;

            console.log(
                "[EVENT] ROOM_REVEALED",
                payload
            );
        }
    );

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

    entrance.tile.isRevealed = true;

    graph.addRoom(entrance);

    const deck =
        new TileDeck(RoomDefinitions);

    const exploreController =
        new ExploreController(
            graph,
            deck
        );

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

    player1.currentRoom = entrance;
    player2.currentRoom = entrance;

    const turnManager =
        new TurnManager();

    turnManager.start([player1, player2]);

    const loop =
        new ExplorationLoopController(
            graph,
            exploreController,
            turnManager
        );

    const fogController =
        new FogOfWarController(graph);

    /* =========================
     * CASE 1
     * Entrance Hall Revealed
     * ========================= */

    console.log(
        "\n[CASE 1] Entrance Hall Revealed"
    );

    console.log(
        "[CASE 1] isRevealed:",
        entrance.tile.isRevealed
    );

    /* =========================
     * CASE 2
     * Explore + Move Reveals Room
     * ========================= */

    console.log(
        "\n[CASE 2] Explore East"
    );

    revealEvents = 0;

    const result2 =
        loop.moveOrExplore(player1, 1, 0);

    const room2 =
        graph.getRoom(1, 0);

    console.log(
        "[CASE 2] Room Revealed:",
        room2?.tile?.isRevealed
    );

    console.log(
        "[CASE 2] ROOM_REVEALED Count:",
        revealEvents
    );

    /* =========================
     * CASE 3
     * Already Revealed Room
     * ========================= */

    console.log(
        "\n[CASE 3] Already Revealed"
    );

    revealEvents = 0;

    loop.moveOrExplore(player1, -1, 0);

    console.log(
        "[CASE 3] ROOM_REVEALED Count:",
        revealEvents
    );

    /* =========================
     * CASE 4
     * Player2 Reveals New Room
     * ========================= */

    console.log(
        "\n[CASE 4] Player2 Reveals North"
    );

    loop.endTurn();

    revealEvents = 0;

    const result4 =
        loop.moveOrExplore(
            player2,
            0,
            -1
        );

    const room4 =
        graph.getRoom(
            0,
            -1
        );

    if (room4) {

        console.log(
            "[CASE 4] Room(0,-1) Revealed:",
            room4.tile.isRevealed
        );
    }

    console.log(
        "[CASE 4] Explore Result:",
        result4
    );

    console.log(
        "[CASE 4] ROOM_REVEALED Count:",
        revealEvents
    );

    /* =========================
     * CASE 5
     * Stats Match
     * ========================= */

    console.log(
        "\n[CASE 5] Stats"
    );

    const allRooms =
        graph.getAllRooms();

    const revealed =
        allRooms.filter(
            r => r.tile.isRevealed
        ).length;

    console.log(
        "[CASE 5] Rooms:",
        `${revealed}/${allRooms.length}`
    );

    /* =========================
     * CASE 6
     * ROOM_REVEALED Payload
     * ========================= */

    console.log(
        "\n[CASE 6] Payload Fields"
    );

    console.log(
        "[CASE 6] roomId:",
        lastRevealPayload?.roomId != null
    );

    console.log(
        "[CASE 6] roomName:",
        typeof lastRevealPayload
            ?.roomName === "string"
    );

    console.log(
        "[CASE 6] x:",
        typeof lastRevealPayload?.x
            === "number"
    );

    console.log(
        "[CASE 6] y:",
        typeof lastRevealPayload?.y
            === "number"
    );

    console.log(
        "[CASE 6] playerId:",
        typeof lastRevealPayload
            ?.playerId === "string"
    );

    /* =========================
     * CASE 7
     * Destroy Cleanup
     * ========================= */

    console.log(
        "\n[CASE 7] Destroy Cleanup"
    );

    const secretRoom =
        new RoomNode(
            99,
            new RoomTile(
                99,
                "Secret Room",
                {
                    north: false,
                    east: false,
                    south: false,
                    west: false
                }
            ),
            5,
            5
        );

    graph.addRoom(secretRoom);

    const beforeDestroy =
        revealEvents;

    fogController.destroy();

    EventBus.emit(
        EventTypes.PLAYER_MOVED,
        {
            toRoomId: secretRoom.id,
            playerId: player1.id
        }
    );

    console.log(
        "[CASE 7] ROOM_REVEALED after destroy:",
        revealEvents - beforeDestroy
    );

    console.log(
        "[CASE 7] isRevealed after destroy:",
        secretRoom.tile.isRevealed
    );

    console.log(
        "\n===== FOG OF WAR TEST COMPLETE ====="
    );
}
