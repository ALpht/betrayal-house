import { ActionPresentationModel } from "./ActionPresentationModel.js";

export class ActionAvailabilityQuery {
    #disabledProvider;

    constructor({ disabledProvider = () => false } = {}) {
        this.#disabledProvider = disabledProvider;
    }

    buildModel(runtime) {
        const disabled = this.#disabledProvider();
        const actions = runtime.getActionAvailability().map(action => ({
            ...action,
            enabled: disabled ? false : action.enabled,
            reason: disabled ? "Game ended" : action.reason
        }));
        return new ActionPresentationModel({
            actions,
            scenarioId: runtime.scenarioId
        });
    }
}
