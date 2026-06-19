import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { CardEffectRegistry }
    from "../card/CardEffectRegistry.js";

export class CardEffectController {

    constructor(
        playerManager,
        gameStateManager
    ) {

        this.playerManager =
            playerManager;

        this.gameStateManager =
            gameStateManager;

        this.onCardDrawn =
            this._onCardDrawn.bind(this);

        EventBus.on(
            EventTypes.CARD_DRAWN,
            this.onCardDrawn
        );

    }

    destroy() {

        EventBus.off(
            EventTypes.CARD_DRAWN,
            this.onCardDrawn
        );

    }

    _onCardDrawn(payload) {

        const { playerId, card, roomId } =
            payload;

        if (!card || !card.effect) return;

        const factory =
            CardEffectRegistry[card.effect];

        if (!factory) {

            console.warn(
                `[CardEffect] Unknown effect: ${card.effect}`
            );

            return;

        }

        const player =
            this.playerManager
                .getPlayer(playerId);

        if (!player) {

            console.warn(
                `[CardEffect] Player not found: ${playerId}`
            );

            return;

        }

        EventBus.emit(
            EventTypes.CARD_EFFECT_REQUESTED,
            {
                playerId,
                cardId: card.id,
                effect: card.effect,
                stat: card.stat,
                amount: card.amount
            }
        );

        const effect = factory();

        const context = {
            player,
            card,
            room: { id: roomId },
            gameState:
                this.gameStateManager
                    .getState(),
            eventBus: EventBus
        };

        effect.resolve(context);

        EventBus.emit(
            EventTypes.CARD_EFFECT_RESOLVED,
            {
                playerId,
                cardId: card.id,
                effect: card.effect,
                stat: card.stat,
                amount: card.amount
            }
        );

    }

}
