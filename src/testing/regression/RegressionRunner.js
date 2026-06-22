import { ScenarioRuntimeFactory }
    from "../../scenario/ScenarioRuntimeFactory.js";

import { RegressionContextFactory }
    from "./RegressionContextFactory.js";

import { RegressionSnapshot }
    from "./RegressionSnapshot.js";

import { RegressionScenarioResult }
    from "./RegressionScenarioResult.js";

export class RegressionRunner {

    run(definition) {
        const scenarioId = definition.metadata.id;

        try {
            const context = RegressionContextFactory.createContext();
            const router = RegressionContextFactory.createRouter();
            const runtime = ScenarioRuntimeFactory.createFromDefinition(definition, context, router);

            runtime.start();

            const snapshot = RegressionSnapshot.capture(runtime);

            runtime.destroy();

            return new RegressionScenarioResult({
                scenarioId,
                passed: true,
                snapshot,
                warnings: [],
                error: null
            });
        } catch (e) {
            return new RegressionScenarioResult({
                scenarioId,
                passed: false,
                snapshot: null,
                warnings: [],
                error: e
            });
        }
    }
}