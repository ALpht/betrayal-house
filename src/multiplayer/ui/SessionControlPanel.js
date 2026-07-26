import { createButton, createElement } from "./MultiplayerDom.js";
import { getDisabledReasonText } from "./MultiplayerDisabledReason.js";
import { HouseMapPanel } from "../../presentation/panel/HouseMapPanel.js";

export class SessionControlPanel {
    constructor({
        onAction = () => {}
    } = {}) {
        this.onAction = onAction;
        this.container = createElement("section", "local-panel multiplayer-session");
        this.mapContainer = createElement("section", "house-map-panel house-map-guest");
        this.mapPanel = new HouseMapPanel({
            container: this.mapContainer
        });
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
            createElement("p", "multiplayer-session-scenario", model.projection?.scenario?.title || ""),
            this.mapContainer,
            actionSection
        ];
        this.mapPanel.render(model.houseMapModel);
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
        this.mapPanel.destroy();
        this.container.replaceChildren();
    }
}
