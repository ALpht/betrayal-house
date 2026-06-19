import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { HauntDice }
    from "../model/HauntDice.js";

export class HauntRollController {

    constructor(hauntRule) {
        this.hauntRule = hauntRule;

        this.handler =
            this.onOmenDrawn.bind(this);

        EventBus.on(
            EventTypes.OMEN_DRAWN,
            this.handler
        );
    }

    destroy() {
        EventBus.off(
            EventTypes.OMEN_DRAWN,
            this.handler
        );
    }

    onOmenDrawn(payload) {
        const { omenCount, card, playerId, roomId } =
            payload;

        EventBus.emit(
            EventTypes.HAUNT_ROLL_REQUESTED,
            {
                omenCount,
                card,
                playerId,
                roomId
            }
        );

        const roll =
            HauntDice.rollSixDice();

        const hauntTriggered =
            this.hauntRule.shouldTrigger(
                roll,
                omenCount
            );

        EventBus.emit(
            EventTypes.HAUNT_ROLL_COMPLETED,
            {
                roll,
                omenCount,
                triggerThreshold: omenCount,
                hauntTriggered
            }
        );
    }

}
