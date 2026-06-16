import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

export class FogOfWarController {

    constructor(graph) {
        this.graph = graph;

        this.handler =
            this.onPlayerMoved.bind(this);

        EventBus.on(
            EventTypes.PLAYER_MOVED,
            this.handler
        );
    }

    destroy() {
        EventBus.off(
            EventTypes.PLAYER_MOVED,
            this.handler
        );
    }

    onPlayerMoved(payload) {
        const { toRoomId, playerId } =
            payload;

        const room =
            this.graph
                .getAllRooms()
                .find(r =>
                    r.id === toRoomId
                );

        if (!room) return;

        if (room.tile.isRevealed) return;

        room.tile.isRevealed = true;

        EventBus.emit(
            EventTypes.ROOM_REVEALED,
            {
                roomId: room.id,
                roomName: room.tile.name,
                x: room.x,
                y: room.y,
                playerId
            }
        );
    }
}
