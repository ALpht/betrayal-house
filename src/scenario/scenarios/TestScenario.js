import { HauntScenario }
    from "../HauntScenario.js";

export class TestScenario
    extends HauntScenario {

    start(context) {

        return {
            scenarioId:
                "testScenario",
            startedAt:
                Date.now()
        };

    }

}
