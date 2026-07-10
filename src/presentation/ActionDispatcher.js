import { ScenarioActionHandler } from "../scenario/action/ScenarioActionHandler.js";

export class ActionDispatcher {
    static dispatch(runtime, action) {
        return ScenarioActionHandler.dispatch(runtime, action);
    }
}
