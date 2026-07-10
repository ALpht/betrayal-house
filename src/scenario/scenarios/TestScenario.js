import { HauntScenario }
    from "../HauntScenario.js";

export class TestScenario
    extends HauntScenario {

    static meta = {
        id: "testScenario",
        traitorRule: "random"
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
