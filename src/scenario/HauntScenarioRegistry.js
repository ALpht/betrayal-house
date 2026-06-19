import { TestScenario }
    from "./scenarios/TestScenario.js";

export const HauntScenarioRegistry = {

    testScenario:
        () => new TestScenario()

};
