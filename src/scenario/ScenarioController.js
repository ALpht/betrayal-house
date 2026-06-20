import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { ScenarioContext }
    from "./runtime/ScenarioContext.js";

import { ScenarioRuntimeFactory }
    from "./ScenarioRuntimeFactory.js";

export class ScenarioController {

    constructor(
        registry,
        gameStateManager,
        worldDeps
    ) {

        this.#registry = registry;
        this.#gameStateManager =
            gameStateManager;
        this.#worldDeps = worldDeps;
        this.#pendingScenario = null;
        this.#currentRuntime = null;

        this.#hauntHandler =
            this.#onHauntTriggered
                .bind(this);

        this.#traitorHandler =
            this.#onTraitorAssigned
                .bind(this);

        this.#turnHandler =
            this.#onTurnChanged
                .bind(this);

        EventBus.on(
            EventTypes.HAUNT_TRIGGERED,
            this.#hauntHandler
        );

        EventBus.on(
            EventTypes.TRAITOR_ASSIGNED,
            this.#traitorHandler
        );

        EventBus.on(
            EventTypes.TURN_CHANGED,
            this.#turnHandler
        );

    }

    destroy() {

        EventBus.off(
            EventTypes.HAUNT_TRIGGERED,
            this.#hauntHandler
        );

        EventBus.off(
            EventTypes.TRAITOR_ASSIGNED,
            this.#traitorHandler
        );

        EventBus.off(
            EventTypes.TURN_CHANGED,
            this.#turnHandler
        );

        this.#pendingScenario = null;
        this.#pendingDefinition = null;
        this.#currentRuntime = null;

    }

    getCurrentScenario() {
        return this.#currentRuntime
            ?.definition || null;
    }

    getCurrentRuntime() {
        return this.#currentRuntime
            || null;
    }

    #registry;
    #gameStateManager;
    #worldDeps;
    #pendingScenario;
    #pendingDefinition;
    #currentRuntime;
    #hauntHandler;
    #traitorHandler;
    #turnHandler;

    #onHauntTriggered(payload) {

        const scenarioId =
            payload?.scenarioId;

        if (!scenarioId) {
            return;
        }

        const definition =
            this.#registry.get(
                scenarioId
            );

        if (!definition) {

            throw new Error(
                `Unknown scenario: ${scenarioId}`
            );

        }

        const scenario =
            definition
                .createScenario();

        this.#pendingScenario =
            scenario;

        this.#pendingDefinition =
            definition;

        EventBus.emit(
            EventTypes.SCENARIO_STARTED,
            {
                scenarioId:
                    definition
                        .metadata.id,
                traitorRule:
                    definition
                        .traitorRule
            }
        );

    }

    #onTraitorAssigned(payload) {

        const scenario =
            this.#pendingScenario;

        if (!scenario) {
            return;
        }

        const context =
            new ScenarioContext({

                players:
                    this.#worldDeps
                        .playerManager,

                gameState:
                    this.#gameStateManager,

                graphMap:
                    this.#worldDeps
                        .graphMap,

                cardManager:
                    this.#worldDeps
                        .cardManager

            });

        const runtime =
            ScenarioRuntimeFactory
                .create(
                    scenario,
                    context
                );

        this.#currentRuntime =
            runtime;

        this.#pendingScenario =
            null;

        runtime.start();

        EventBus.emit(
            EventTypes
                .SCENARIO_RUNTIME_CREATED,
            {
                scenarioId:
                    runtime.scenarioId
            }
        );

    }

    #onTurnChanged(payload) {

        const runtime =
            this.#currentRuntime;

        if (
            !runtime
            || !runtime.isActive
        ) {
            return;
        }

        runtime.onTurnEnd();
        runtime.onTurnStart();
        runtime.update();

        const result =
            runtime.checkVictory();

        EventBus.emit(
            EventTypes
                .SCENARIO_RUNTIME_UPDATED,
            {
                scenarioId:
                    runtime.scenarioId,
                state:
                    runtime.state
                        .serialize()
            }
        );

        if (result) {
            EventBus.emit(
                EventTypes
                    .SCENARIO_COMPLETED,
                {
                    scenarioId:
                        runtime.scenarioId,
                    ...result
                }
            );
        }

    }

}
