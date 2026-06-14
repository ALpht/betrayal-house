import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

export class MovementController {

    static canMove(
        player,
        targetRoom
    ) {

        if (!player)
            return false;

        if (!player.currentRoom)
            return false;

        if (!targetRoom)
            return false;

        if (
            player.currentRoom ===
            targetRoom
        ) {
            return false;
        }

        return player.currentRoom
            .getNeighbors()
            .includes(targetRoom);
    }

    static movePlayer(
        player,
        targetRoom
    ) {

        if (
            !this.canMove(
                player,
                targetRoom
            )
        ) {
            return false;
        }

        const fromRoom =
            player.currentRoom;

        player.currentRoom =
            targetRoom;

        EventBus.emit(
            EventTypes.PLAYER_MOVED,
            {
                playerId:
                    player.id,

                fromRoomId:
                    fromRoom.id,

                toRoomId:
                    targetRoom.id
            }
        );

        return true;
    }
}