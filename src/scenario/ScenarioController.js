import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

export class ScenarioController {

    constructor(
        registry,
        gameStateManager
    ) {
        this.#registry = registry;
        this.#gameStateManager =
            gameStateManager;
        this.#currentScenario = null;

        this.handler =
            this.#onHauntTriggered
                .bind(this);

        EventBus.on(
            EventTypes.HAUNT_TRIGGERED,
            this.handler
        );
    }

    destroy() {
        EventBus.off(
            EventTypes.HAUNT_TRIGGERED,
            this.handler
        );

        this.#currentScenario = null;
    }

    getCurrentScenario() {
        return this.#currentScenario;
    }

    #registry;
    #gameStateManager;
    #currentScenario;

    #onHauntTriggered(payload) {

        const scenarioId =
            payload?.scenarioId;

        if (!scenarioId) {
            return;
        }

        const factory =
            this.#registry[scenarioId];

        if (!factory) {

            throw new Error(
                `Unknown scenario: ${scenarioId}`
            );

        }

        const scenario = factory();

        const context = {
            gameStateManager:
                this.#gameStateManager
        };

        const result =
            scenario.start(context);

        const meta =
            scenario.getMeta();

        this.#currentScenario =
            scenario;

        EventBus.emit(
            EventTypes.SCENARIO_STARTED,
            {
                ...result,
                traitorRule:
                    meta.traitorRule
            }
        );
    }

}
