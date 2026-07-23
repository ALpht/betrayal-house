import { createButton, createElement } from "./MultiplayerDom.js";
import { getDisabledReasonText } from "./MultiplayerDisabledReason.js";

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
            {
                disabled: !action.enabled || Boolean(model.disabledReason),
                className: "local-command multiplayer-action-button"
            }
        ));
        const cards = Array.isArray(model.projection?.cards) ? model.projection.cards : [];
        const latestCard = cards.at(-1);
        const actionSection = createElement("section", "multiplayer-action-list");
        actionSection.replaceChildren(
            createElement("h3", "", model.actions.length ? "Your Actions" : "Waiting"),
            ...(model.disabledReason
                ? [createElement("p", "multiplayer-turn-note", getDisabledReasonText(model.disabledReason))]
                : []),
            ...actionButtons
        );

        const children = [
            createElement("p", "multiplayer-public-kicker", "Personal Controller"),
            createElement("h2", "", model.projection?.scenario?.title || "Game Session"),
            actionSection
        ];
        if (latestCard) {
            const card = createElement("section", "multiplayer-visible-card");
            card.replaceChildren(
                createElement("h3", "", "Latest Card"),
                createElement("pre", "", JSON.stringify(latestCard, null, 2))
            );
            children.push(card);
        }

        this.container.replaceChildren(...children);
        return this.container;
    }

    destroy() {
        this.container.replaceChildren();
    }
}
