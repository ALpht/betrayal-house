import { createButton, createElement } from "./MultiplayerDom.js";

export class HostLobbyPanel {
    constructor({
        onCreateRoom = () => {},
        onStartSession = () => {},
        onCloseRoom = () => {},
        onNewLanGame = () => {},
        onCopyRoomCode = () => {}
    } = {}) {
        this.onCreateRoom = onCreateRoom;
        this.onStartSession = onStartSession;
        this.onCloseRoom = onCloseRoom;
        this.onNewLanGame = onNewLanGame;
        this.onCopyRoomCode = onCopyRoomCode;
        this.container = createElement("section", "local-panel multiplayer-host");
    }

    render(model) {
        const code = createElement("pre", "multiplayer-room-code", model.roomCode || "No room yet");
        code.setAttribute("data-room-code", model.roomCode || "");
        const canStart = model.lobbyState === "JOINED" &&
            model.sessionState !== "ACTIVE" &&
            !model.startPending;

        this.container.replaceChildren(
            createElement("h2", "", "Host LAN Game"),
            createButton("Create Room", this.onCreateRoom, {
                disabled: model.lobbyState === "CREATING" || model.sessionState === "ACTIVE"
            }),
            createElement("span", "local-label", "Room Code"),
            code,
            createButton("Copy Room Code", this.onCopyRoomCode, {
                disabled: !model.roomCode
            }),
            createElement("p", "local-help", model.copyMessage || "Room code stays selectable if clipboard copy is unavailable."),
            createElement("p", "local-feedback", model.statusMessage || "Create a room and wait for the Guest."),
            createButton(model.startPending ? "Starting..." : "Start Session", this.onStartSession, {
                disabled: !canStart
            }),
            createButton("Close Room", this.onCloseRoom, {
                disabled: !model.roomCode || model.lobbyState === "CLOSED"
            }),
            createButton("New LAN Game", this.onNewLanGame)
        );
        return this.container;
    }

    destroy() {
        this.container.replaceChildren();
    }
}
