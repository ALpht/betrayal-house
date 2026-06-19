import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

export class HauntManager {

    constructor() {
        this.handler =
            this.onHauntRollCompleted.bind(this);

        EventBus.on(
            EventTypes.HAUNT_ROLL_COMPLETED,
            this.handler
        );
    }

    destroy() {
        EventBus.off(
            EventTypes.HAUNT_ROLL_COMPLETED,
            this.handler
        );
    }

    onHauntRollCompleted(payload) {
        if (!payload.hauntTriggered) return;

        EventBus.emit(
            EventTypes.HAUNT_TRIGGERED
        );
    }

}
