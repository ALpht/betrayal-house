import { createButton, createElement } from "./MultiplayerDom.js";

export class MultiplayerEntryPanel {
    constructor({
        onLocal = () => {},
        onHost = () => {},
        onGuest = () => {}
    } = {}) {
        this.onLocal = onLocal;
        this.onHost = onHost;
        this.onGuest = onGuest;
        this.container = createElement("section", "local-setup multiplayer-entry");
    }

    render() {
        this.container.replaceChildren(
            createElement("h1", "", "Betrayal House"),
            createElement("p", "local-help", "Choose how to play."),
            createButton("Local Hot-seat", this.onLocal),
            createButton("Host LAN Game", this.onHost),
            createButton("Join LAN Game", this.onGuest)
        );
        return this.container;
    }

    destroy() {
        this.container.replaceChildren();
    }
}
