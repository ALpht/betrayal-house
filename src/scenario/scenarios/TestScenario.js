import { HauntScenario }
    from "../HauntScenario.js";

export class TestScenario
    extends HauntScenario {

    static meta = {
        id: "testScenario",
        title: "Test Scenario",
        description: "A test scenario.",
        difficulty: 1,
        traitorRule: "random",
        objectives: {
            heroes: "Complete the test.",
            traitor: "Stop the heroes."
        }
    };

    start(context, state) {

        state.set(
            "scenarioId",
            "testScenario"
        );

        state.set(
            "startedAt",
            Date.now()
        );

    }

}
