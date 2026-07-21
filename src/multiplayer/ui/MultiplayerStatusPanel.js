import { getDisabledReasonText } from "./MultiplayerDisabledReason.js";
import { createElement } from "./MultiplayerDom.js";

export class MultiplayerStatusPanel {
    constructor() {
        this.container = createElement("section", "local-panel multiplayer-status");
    }

    render(model) {
        const lines = [
            `Mode: ${model.mode}`,
            `Connection: ${model.connectionState}`,
            `Lobby: ${model.lobbyState}`,
            `Session: ${model.sessionState}`,
            `Role: ${model.role || "Unassigned"}`,
            `Assigned player: ${model.playerName || model.playerId || "Loading"}`,
            `Current player: ${model.currentPlayerName || model.currentPlayerId || "Unknown"}`
        ];

        if (model.disabledReason) {
            lines.push(`Action unavailable: ${getDisabledReasonText(model.disabledReason)}`);
        }

        if (model.hasUncertainAction) {
            lines.push("Your last action may or may not have been applied.");
        }

        this.container.replaceChildren(
            createElement("h2", "", "LAN Status"),
            createElement("pre", "local-status", lines.join("\n"))
        );
        return this.container;
    }

    destroy() {
        this.container.replaceChildren();
    }
}
