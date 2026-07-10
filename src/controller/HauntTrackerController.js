import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

export class HauntTrackerController {

    constructor(hauntTracker) {
        this.hauntTracker = hauntTracker;

        this.handler =
            this.onCardDrawn.bind(this);

        EventBus.on(
            EventTypes.CARD_DRAWN,
            this.handler
        );
    }

    destroy() {
        EventBus.off(
            EventTypes.CARD_DRAWN,
            this.handler
        );
    }

    onCardDrawn(payload) {
        const { card, playerId, roomId } =
            payload;

        if (card.type !== "omen") return;

        this.hauntTracker.trackOmen(
            card,
            playerId,
            roomId
        );

        EventBus.emit(
            EventTypes.OMEN_DRAWN,
            {
                omenCount:
                    this.hauntTracker
                        .getOmenCount(),

                card,
                playerId,
                roomId
            }
        );
    }

}
