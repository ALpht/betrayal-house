import { HauntScenario }
    from "../HauntScenario.js";

export class TestScenario
    extends HauntScenario {

    static meta = {
        traitorRule: "random"
    };

    start(context) {

        return {
            scenarioId:
                "testScenario",
            startedAt:
                Date.now()
        };

    }

}
