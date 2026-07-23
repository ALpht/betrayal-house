import { createButton, createElement, createLabeledInput } from "./MultiplayerDom.js";

export class GuestJoinPanel {
    constructor({
        onDisplayNameChanged = () => {},
        onJoin = () => {},
        onReady = () => {},
        onLeave = () => {},
        onReconnect = () => {},
        onReturn = () => {}
    } = {}) {
        this.onDisplayNameChanged = onDisplayNameChanged;
        this.onJoin = onJoin;
        this.onReady = onReady;
        this.onLeave = onLeave;
        this.onReconnect = onReconnect;
        this.onReturn = onReturn;
        this.container = createElement("section", "local-panel multiplayer-guest");
    }

    getRoomCode() {
        return "";
    }

    render(model) {
        const displayName = createLabeledInput({
            label: "Display Name",
            value: model.displayName,
            placeholder: "Player",
            onInput: this.onDisplayNameChanged
        });
        const canJoin = !model.joinPending && model.sessionState !== "ACTIVE";
        const canReconnect = !model.reconnectInProgress &&
            model.connectionState === "RECONNECTING";
        const active = model.sessionState === "ACTIVE" || model.sessionState === "GAME_ENDED";
        const joined = Boolean(model.projection) ||
            active ||
            (model.lobbyState !== "IDLE" && model.lobbyState !== "FAILED");

        this.container.replaceChildren(
            createGuestHeader(model, active),
            joined ? createJoinedPanel(model, this, canReconnect) : createJoinPanel(model, displayName, this, canJoin),
            ...(model.hasUncertainAction
                ? [createElement("p", "multiplayer-safety-warning", "Your last action may or may not have been applied.")]
                : []),
            createElement("p", "local-error", model.errorMessage || "")
        );
        return this.container;
    }

    destroy() {
        this.container.replaceChildren();
    }
}

function createGuestHeader(model, active) {
    const header = createElement("header", "multiplayer-phone-header");
    header.replaceChildren(
        createElement("p", "multiplayer-public-kicker", active ? "LAN Game" : "LAN Lobby"),
        createElement("h2", "", active ? "Your Game View" : "Join the Table"),
        createElement("p", "local-feedback", model.statusMessage || (model.roomCode ? "Room found. Enter your name to join." : "Scan the Host QR code to join."))
    );
    return header;
}

function createJoinPanel(model, displayName, panel, canJoin) {
    const join = createElement("section", "multiplayer-phone-card");
    join.replaceChildren(
        createElement("div", "multiplayer-phone-crest", "B"),
        createElement("p", "local-help", model.roomCode ? "The QR already carries the Host address and room token." : "Open this page by scanning the Host screen QR."),
        displayName.wrapper,
        createButton(model.joinPending ? "Joining..." : "Join Game", panel.onJoin, {
            disabled: !canJoin,
            className: "local-command multiplayer-primary-action"
        }),
        createButton("Return to Entry", panel.onReturn)
    );
    return join;
}

function createJoinedPanel(model, panel, canReconnect) {
    const joined = createElement("section", "multiplayer-phone-card");
    const active = model.sessionState === "ACTIVE" || model.sessionState === "GAME_ENDED";
    const reconnecting = model.connectionState === "RECONNECTING";
    const controls = active
        ? [
            createButton("Leave Game", panel.onLeave, {
                disabled: model.lobbyState === "IDLE" || model.lobbyState === "CLOSED",
                className: "multiplayer-secondary-action"
            })
        ]
        : [
            ...(reconnecting ? [
                createButton(model.reconnectInProgress ? "Reconnecting..." : "Reconnect", panel.onReconnect, {
                    disabled: !canReconnect
                })
            ] : []),
            createButton("Leave Room", panel.onLeave, {
                disabled: model.lobbyState === "IDLE" || model.lobbyState === "CLOSED",
                className: "multiplayer-secondary-action"
            })
        ];

    joined.replaceChildren(
        createElement("div", "multiplayer-phone-crest", getCrestText(model)),
        createStatusLine("Assigned", model.playerName || model.playerId || "Waiting"),
        createStatusLine("Current Turn", model.currentPlayerName || model.currentPlayerId || "Waiting"),
        ...controls
    );
    return joined;
}

function getCrestText(model) {
    if (!model.playerName) return model.ready ? "R" : "B";
    return model.playerName
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase();
}

function createStatusLine(label, value) {
    const line = createElement("p", "multiplayer-phone-status");
    line.replaceChildren(
        createElement("span", "", label),
        createElement("strong", "", value)
    );
    return line;
}
