export class CharacterPanel {
    #container;

    constructor({ container }) {
        this.#container = container;
    }

    render(model) {
        const stats = model.stats || {};
        const statText = [
            `Speed ${stats.speed ?? "-"}`,
            `Might ${stats.might ?? "-"}`,
            `Sanity ${stats.sanity ?? "-"}`,
            `Knowledge ${stats.knowledge ?? "-"}`
        ].join(" | ");

        this.#container.textContent = [
            `Current Character: ${model.characterName || model.playerName}`,
            statText
        ].join("\n");
    }

    destroy() {
        this.#container.textContent = "";
    }
}
