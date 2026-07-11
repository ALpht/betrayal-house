const CARD_TYPE_LABELS = Object.freeze({
    event: "Event",
    item: "Item",
    omen: "Omen"
});

export class CardPanel {

    #container;

    constructor({ container }) {
        this.#container = container;
    }

    render(model) {
        if (model.cards.length === 0) {
            this.#container.textContent = model.emptyMessage;
            return;
        }

        const lines = [];
        lines.push(`${model.title}:`);

        for (const card of model.cards) {
            const typeLabel = CARD_TYPE_LABELS[card.type] || card.type;
            lines.push(`[${typeLabel}] ${card.name}`);
            if (card.description) {
                lines.push(`  ${card.description}`);
            }
        }

        this.#container.textContent = lines.join("\n");
    }

    destroy() {
        this.#container.textContent = "";
    }

}
