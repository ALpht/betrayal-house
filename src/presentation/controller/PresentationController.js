import { EventBus } from "../../core/EventBus.js";
import { EventTypes } from "../../core/EventTypes.js";

export class PresentationController {
    #runtimeProvider;
    #panels;
    #subscriptions;
    #initialized;

    /**
     * @param {Object} options
     * @param {() => ScenarioRuntime | null} options.runtimeProvider
     *   由 Composition Root 提供。
     *   來源可以是 ScenarioController / RuntimeManager / ReplayController / MultiplayerController。
     *   PresentationController 不知道來源。
     * @param {Map<string, {panel: Panel, query: Query}>} options.panels
     */
    constructor({ runtimeProvider, panels }) {
        this.#runtimeProvider = runtimeProvider;
        this.#panels = panels;
        this.#subscriptions = [];
        this.#initialized = false;
    }

    init() {
        if (this.#initialized) return;

        this.#subscriptions = [
            [EventTypes.SCENARIO_RUNTIME_UPDATED, () => this.#refreshAll()],
            [EventTypes.SCENARIO_STARTED, () => this.#refreshAll()],
            [EventTypes.TURN_CHANGED, () => this.#refreshAll()],
        ];
        this.#subscriptions.forEach(([event, handler]) => {
            EventBus.on(event, handler);
        });

        this.#refreshAll();
        this.#initialized = true;
    }

    #refreshAll() {
        for (const entry of this.#panels.values()) {
            this.#refreshPanel(entry);
        }
    }

    #refreshPanel(entry) {
        const runtime = this.#runtimeProvider();
        if (!runtime) return;

        const model = entry.query.buildModel(runtime);
        entry.panel.render(model);
    }

    destroy() {
        this.#subscriptions.forEach(([event, handler]) => {
            EventBus.off(event, handler);
        });
        this.#subscriptions = [];
        this.#runtimeProvider = null;
        this.#initialized = false;
    }
}
