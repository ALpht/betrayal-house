import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

export class CardTriggerController {

    constructor(
        graph,
        eventDeck,
        itemDeck,
        omenDeck
    ) {

        this.graph = graph;

        this.eventDeck = eventDeck;

        this.itemDeck = itemDeck;

        this.omenDeck = omenDeck;

        this.handler =
            this.onRoomRevealed.bind(this);

        EventBus.on(
            EventTypes.ROOM_REVEALED,
            this.handler
        );

    }

    destroy() {

        EventBus.off(
            EventTypes.ROOM_REVEALED,
            this.handler
        );

    }

    onRoomRevealed(payload) {

        const { x, y, playerId } = payload;

        const triggerType =
            this.getTriggerType(x, y);

        if (!triggerType) return;

        const deck =
            this.getDeck(triggerType);

        if (!deck) return;

        EventBus.emit(
            EventTypes.CARD_DRAW_REQUESTED,
            {
                deckType: triggerType,
                playerId,
                roomId: this.getRoomId(x, y)
            }
        );

        const card = deck.draw();

        if (!card) return;

        EventBus.emit(
            EventTypes.CARD_DRAWN,
            {
                deckType: triggerType,
                triggerType,
                playerId,
                roomId: this.getRoomId(x, y),
                cardId: card.id,
                card
            }
        );

    }

    getTriggerType(x, y) {

        const room =
            this.graph.getRoom(x, y);

        if (!room) {

            console.warn(
                `[CardTrigger] Room not found at (${x}, ${y})`
            );

            return null;

        }

        return room.tile.triggerType;

    }

    getRoomId(x, y) {

        const room =
            this.graph.getRoom(x, y);

        return room
            ? room.id
            : null;

    }

    getDeck(triggerType) {

        switch (triggerType) {

            case 'event':
                return this.eventDeck;

            case 'item':
                return this.itemDeck;

            case 'omen':
                return this.omenDeck;

            default:
                return null;

        }

    }

}
