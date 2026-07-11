export class CharacterPanel {

    #container;

    constructor({ container }) {
        this.#container = container;
    }

    render(model) {
        const lines = [];

        if (model.displayName) {
            lines.push(`Character: ${model.characterName}`);
            lines.push(`Player: ${model.displayName}`);
        }

        if (model.currentRoomName) {
            lines.push(`Room: ${model.currentRoomName}`);
        }

        lines.push(`Speed: ${model.speed}`);
        lines.push(`Might: ${model.might}`);
        lines.push(`Sanity: ${model.sanity}`);
        lines.push(`Knowledge: ${model.knowledge}`);

        lines.push(`Items: ${model.inventoryCount}`);
        lines.push(`Omens: ${model.omenCount}`);

        lines.push(`Status: ${model.lifeState}`);

        this.#container.textContent = lines.join("\n");
    }

    destroy() {
        this.#container.textContent = "";
    }

}
