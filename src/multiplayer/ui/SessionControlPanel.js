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

    render(model, transition = null) {
        const movementActions = model.actions.filter(
            action => action.type === "MOVE" && action.payload?.direction
        );
        const otherActions = model.actions.filter(
            action => !movementActions.includes(action)
        );
        const movementGrid = createElement(
            "section",
            "multiplayer-movement-controls"
        );
        movementGrid.setAttribute("aria-label", "Movement");
        movementGrid.replaceChildren(
            ...movementActions.map(action => createActionButton(
                action,
                model,
                this.onAction,
                `direction-${action.payload.direction}`
            ))
        );
        const actionButtons = otherActions.map(action => createActionButton(
            action,
            model,
            this.onAction,
            action.type === "END_TURN" ? "end-turn" : ""
        ));
        const cards = Array.isArray(model.projection?.cards) ? model.projection.cards : [];
        const latestCard = cards.at(-1);
        const actionSection = createElement("section", "multiplayer-action-list");
        actionSection.replaceChildren(
            createElement("h3", "", model.actions.length ? "Your Actions" : "Waiting"),
            ...(model.disabledReason
                ? [createElement("p", "multiplayer-turn-note", getDisabledReasonText(model.disabledReason))]
                : []),
            ...(movementActions.length ? [movementGrid] : []),
            ...actionButtons
        );

        const children = [
            createElement("p", "multiplayer-session-scenario", model.projection?.scenario?.title || ""),
            this.mapContainer,
            actionSection
        ];
        this.mapPanel.render(model.houseMapModel, transition);
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

function createActionButton(action, model, onAction, modifier = "") {
    return createButton(
        action.label,
        () => onAction(action),
        {
            disabled: !action.enabled || Boolean(model.disabledReason),
            className: [
                "local-command",
                "multiplayer-action-button",
                modifier ? `multiplayer-action-button--${modifier}` : ""
            ].filter(Boolean).join(" ")
        }
    );
}
