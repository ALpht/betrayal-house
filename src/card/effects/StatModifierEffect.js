import { CardEffect }
    from './CardEffect.js';

import { EventTypes }
    from '../../core/EventTypes.js';

export class StatModifierEffect
    extends CardEffect {

    resolve(context) {

        const { player, card, eventBus } =
            context;

        const value =
            player.stats.modifyStat(
                card.stat,
                card.amount
            );

        eventBus.emit(
            EventTypes.PLAYER_STAT_CHANGED,
            {
                playerId: player.id,
                stat: card.stat,
                value
            }
        );

    }

}
