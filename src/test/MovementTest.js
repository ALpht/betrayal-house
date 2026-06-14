import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { CharacterFactory }
    from "../model/CharacterFactory.js";

import { PlayerManager }
    from "../model/PlayerManager.js";

import { PlayerSpawnController }
    from "../controller/PlayerSpawnController.js";

import { MovementController }
    from "../controller/MovementController.js";

export function runMovementTest(
    graph
) {

    console.log(
        "===== Movement Test ====="
    );

    const manager =
        new PlayerManager();

    const player =
        CharacterFactory.create(
            "brandon"
        );

    const entrance =
        graph.getRoom(
            0,
            0
        );

    PlayerSpawnController.spawnPlayer(
        player,
        entrance
    );

    manager.addPlayer(
        player
    );

    EventBus.on(
        EventTypes.PLAYER_MOVED,
        payload => {

            console.log(
                "PLAYER_MOVED",
                payload
            );

        }
    );

    const targetRoom =
        graph.getRoom(
            1,
            0
        );

    console.log(
        "Can Move:",
        MovementController.canMove(
            player,
            targetRoom
        )
    );

    MovementController.movePlayer(
        player,
        targetRoom
    );

    console.log(
        "Current Room:",
        player.currentRoom
    );

    const farRoom =
        graph.getRoom(
            2,
            0
        );

    console.log(
        "Can Move To Far Room:",
        MovementController.canMove(
            player,
            farRoom
        )
    );

    console.log(
        "Can Move To Same Room:",
        MovementController.canMove(
            player,
            player.currentRoom
        )
    );
}