export class ScenarioPanel {
    #container;

    constructor({ container }) {
        this.#container = container;
    }

    render(model) {
        const lines = [];

        if (model.scenarioName) {
            lines.push(`Scenario: ${model.scenarioName}`);
        }

        if (model.objectiveText) {
            lines.push(`Objective: ${model.objectiveText}`);
        }

        for (const info of model.visibleInfo) {
            if (info.scope === "scenario" && info.payload?.text) {
                lines.push(info.payload.text);
            }
        }

        this.#container.textContent = lines.join("\n");
    }

    destroy() {
        this.#container.textContent = "";
    }
}
