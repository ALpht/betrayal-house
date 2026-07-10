import { ScenarioBuilder } from "./ScenarioBuilder.js";

export class ScenarioTemplate {

    static standardHaunt() {
        return new ScenarioBuilder()
            .setTraitorRule("random");
    }

    static objectiveDriven() {
        return new ScenarioBuilder()
            .setTraitorRule("random");
    }

    static traitorDriven() {
        return new ScenarioBuilder()
            .setTraitorRule("random");
    }

    static cooperative() {
        return new ScenarioBuilder()
            .setTraitorRule("random");
    }
}
