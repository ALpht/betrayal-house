import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";
import { InformationPacketFactory } from "../scenario/information/InformationPacketFactory.js";
import { InformationAudience } from "../scenario/information/InformationAudience.js";
import { InformationScope } from "../scenario/information/InformationScope.js";

export class CardInformationAdapter {

    #router;
    #handler;

    constructor({ router }) {
        this.#router = router;
        this.#handler = this.#onCardDrawn.bind(this);
        EventBus.on(EventTypes.CARD_DRAWN, this.#handler);
    }

    #onCardDrawn(payload) {
        const { playerId, card, triggerType, roomId } = payload;
        if (!card) return;

        const packet = InformationPacketFactory.create({
            audience: InformationAudience.ALL_PLAYERS,
            scope: InformationScope.CARD,
            payload: {
                playerId,
                cardId: card.id,
                name: card.name,
                type: card.type,
                description: card.description,
                triggerType,
                roomId
            }
        });

        this.#router.route(packet);
    }

    destroy() {
        EventBus.off(EventTypes.CARD_DRAWN, this.#handler);
        this.#router = null;
    }

}
