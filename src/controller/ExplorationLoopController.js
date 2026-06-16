// src/controller/ExplorationLoopController.js

import { MovementController }
    from "./MovementController.js";

export class ExplorationLoopController {

    constructor(
        graph,
        exploreController,
        turnManager
    ) {
        this.graph =
            graph;

        this.exploreController =
            exploreController;

        this.turnManager =
            turnManager;
    }

    moveOrExplore(
        player,
        dx,
        dy
    ) {

        if (
            !this.turnManager.isCurrentPlayer(
                player
            )
        ) {
            console.warn(
                "[TURN] Not current player"
            );

            return false;
        }

        const currentRoom =
            player.getCurrentRoom();

        if (!currentRoom) {

            console.warn(
                "[PLAYER] No current room"
            );

            return false;
        }

        const targetX =
            currentRoom.x + dx;

        const targetY =
            currentRoom.y + dy;

        let targetRoom =
            this.graph.getRoom(
                targetX,
                targetY
            );

        // 已揭露房間
        if (targetRoom) {

            return MovementController
                .movePlayer(
                    player,
                    targetRoom
                );
        }

        // 未揭露房間
        targetRoom =
            this.exploreController.explore(
                targetX,
                targetY
            );

        if (!targetRoom) {

            return false;
        }

        return MovementController
            .movePlayer(
                player,
                targetRoom
            );
    }

    endTurn() {

        this.turnManager
            .nextTurn();
    }
}