import { EventBus } from "../../core/EventBus.js";
import { EventTypes } from "../../core/EventTypes.js";

export class ExplorationTurnResolutionTracker {
    track(operation) {
        let hauntTriggered = false;
        let runtimeCreated = false;
        let turnChangedDuringResolution = false;

        const onHauntTriggered = () => {
            hauntTriggered = true;
        };
        const onRuntimeCreated = () => {
            runtimeCreated = true;
        };
        const onTurnChanged = () => {
            turnChangedDuringResolution = true;
        };

        EventBus.on(EventTypes.HAUNT_TRIGGERED, onHauntTriggered);
        EventBus.on(EventTypes.SCENARIO_RUNTIME_CREATED, onRuntimeCreated);
        EventBus.on(EventTypes.TURN_CHANGED, onTurnChanged);

        try {
            const value = operation();
            return {
                value,
                resolution: Object.freeze({
                    hauntTriggered,
                    runtimeCreated,
                    turnResolvedByHauntLifecycle:
                        hauntTriggered && turnChangedDuringResolution
                })
            };
        } finally {
            EventBus.off(EventTypes.HAUNT_TRIGGERED, onHauntTriggered);
            EventBus.off(EventTypes.SCENARIO_RUNTIME_CREATED, onRuntimeCreated);
            EventBus.off(EventTypes.TURN_CHANGED, onTurnChanged);
        }
    }
}
