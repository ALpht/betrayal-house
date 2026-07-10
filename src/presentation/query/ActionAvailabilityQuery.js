import { ActionPresentationModel } from "./ActionPresentationModel.js";

export class ActionAvailabilityQuery {
    buildModel(runtime) {
        const actions = runtime.getActionAvailability();
        return new ActionPresentationModel({
            actions,
            scenarioId: runtime.scenarioId
        });
    }
}