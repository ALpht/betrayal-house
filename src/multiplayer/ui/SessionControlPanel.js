import { createButton, createElement } from "./MultiplayerDom.js";

export class SessionControlPanel {
    constructor({
        onAction = () => {}
    } = {}) {
        this.onAction = onAction;
        this.container = createElement("section", "local-panel multiplayer-session");
    }

    render(model) {
        const actionButtons = model.actions.map(action => createButton(
            action.label,
            () => this.onAction(action),
            { disabled: !action.enabled || Boolean(model.disabledReason) }
        ));
        const latestCard = Array.isArray(model.projection?.cards) && model.projection.cards.length > 0
            ? JSON.stringify(model.projection.cards[model.projection.cards.length - 1], null, 2)
            : "No visible card";

        this.container.replaceChildren(
            createElement("h2", "", "Session"),
            createElement("pre", "local-panel", model.projection?.scenario?.title || "Waiting for session"),
            createElement("pre", "local-panel", `Latest visible card:\n${latestCard}`),
            ...actionButtons
        );
        return this.container;
    }

    destroy() {
        this.container.replaceChildren();
    }
}
