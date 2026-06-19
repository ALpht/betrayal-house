import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

export class TraitorAssignmentController {

    constructor(
        registry,
        playerManager,
        gameStateManager
    ) {
        this.#registry = registry;
        this.#playerManager =
            playerManager;
        this.#gameStateManager =
            gameStateManager;

        this.#handler =
            this.#onScenarioStarted
                .bind(this);

        EventBus.on(
            EventTypes.SCENARIO_STARTED,
            this.#handler
        );
    }

    destroy() {
        EventBus.off(
            EventTypes.SCENARIO_STARTED,
            this.#handler
        );

        this.#registry = null;
        this.#playerManager = null;
        this.#gameStateManager = null;
        this.#handler = null;
    }

    #registry;
    #playerManager;
    #gameStateManager;
    #handler;

    #onScenarioStarted(payload) {

        const ruleKey =
            payload?.traitorRule;

        if (
            !ruleKey
            || !this.#registry[ruleKey]
        ) {
            return;
        }

        EventBus.emit(
            EventTypes
                .TRAITOR_ASSIGNMENT_REQUESTED,
            {
                scenarioId:
                    payload.scenarioId
            }
        );

        const rule =
            this.#registry[ruleKey]();

        const players =
            this.#playerManager
                .getAllPlayers();

        const { traitorPlayerId } =
            rule.assign({ players });

        this.#gameStateManager
            .setTraitorPlayerId(
                traitorPlayerId
            );

        EventBus.emit(
            EventTypes.TRAITOR_ASSIGNED,
            {
                traitorPlayerId,
                scenarioId:
                    payload.scenarioId
            }
        );

    }

}
