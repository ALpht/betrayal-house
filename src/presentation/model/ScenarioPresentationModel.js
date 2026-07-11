export class ScenarioPresentationModel {
    #scenarioName;
    #objectiveText;
    #visibleInfo;

    constructor({ scenarioName, objectiveText, visibleInfo }) {
        this.#scenarioName = scenarioName;
        this.#objectiveText = objectiveText;
        this.#visibleInfo = Object.freeze(
            visibleInfo.map(i => Object.freeze({ ...i }))
        );
        Object.freeze(this);
    }

    get scenarioName() {
        return this.#scenarioName;
    }

    get objectiveText() {
        return this.#objectiveText;
    }

    get visibleInfo() {
        return this.#visibleInfo;
    }
}
