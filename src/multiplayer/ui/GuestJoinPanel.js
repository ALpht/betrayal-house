import { createButton, createElement, createLabeledInput } from "./MultiplayerDom.js";

export class GuestJoinPanel {
    constructor({
        onAddressChanged = () => {},
        onRoomCodeChanged = () => {},
        onJoin = () => {},
        onLeave = () => {},
        onReconnect = () => {},
        onReturn = () => {}
    } = {}) {
        this.onAddressChanged = onAddressChanged;
        this.onRoomCodeChanged = onRoomCodeChanged;
        this.onJoin = onJoin;
        this.onLeave = onLeave;
        this.onReconnect = onReconnect;
        this.onReturn = onReturn;
        this.roomCode = "";
        this.container = createElement("section", "local-panel multiplayer-guest");
    }

    getRoomCode() {
        return this.roomCode;
    }

    render(model) {
        const address = createLabeledInput({
            label: "Host Server Address",
            value: model.hostServerAddress,
            placeholder: "http://192.168.1.100:3001",
            onInput: this.onAddressChanged
        });
        const room = createLabeledInput({
            label: "Room Code",
            value: this.roomCode,
            placeholder: "ABCD",
            onInput: value => {
                this.roomCode = value.toUpperCase();
                this.onRoomCodeChanged(this.roomCode);
            }
        });
        const canJoin = !model.joinPending && model.sessionState !== "ACTIVE";
        const canReconnect = !model.reconnectInProgress &&
            model.connectionState === "RECONNECTING";

        this.container.replaceChildren(
            createElement("h2", "", "Join LAN Game"),
            address.wrapper,
            room.wrapper,
            createElement("p", "local-help", "Use localhost only on the Host computer. A second device must use the Host computer's LAN address."),
            createButton(model.joinPending ? "Joining..." : "Join Room", this.onJoin, {
                disabled: !canJoin
            }),
            createButton(model.reconnectInProgress ? "Reconnecting..." : "Reconnect", this.onReconnect, {
                disabled: !canReconnect
            }),
            createButton("Leave Room", this.onLeave, {
                disabled: model.lobbyState === "IDLE" || model.lobbyState === "CLOSED"
            }),
            createButton("Return to Entry", this.onReturn),
            createElement("p", "local-feedback", model.statusMessage || "Enter the Host server address and room code."),
            createElement("p", "local-error", model.errorMessage || "")
        );
        return this.container;
    }

    destroy() {
        this.container.replaceChildren();
    }
}
