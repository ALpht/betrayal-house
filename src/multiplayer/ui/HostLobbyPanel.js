import { createButton, createElement } from "./MultiplayerDom.js";
import { createQrCodeSvg } from "./QrCodeSvg.js";
import { HouseMapPanel } from "../../presentation/panel/HouseMapPanel.js";

export class HostLobbyPanel {
    constructor({
        onCreateRoom = () => {},
        onPlayerCountChanged = () => {},
        onStartSession = () => {},
        onCloseRoom = () => {},
        onNewLanGame = () => {},
        onCopyRoomCode = () => {}
    } = {}) {
        this.onCreateRoom = onCreateRoom;
        this.onPlayerCountChanged = onPlayerCountChanged;
        this.onStartSession = onStartSession;
        this.onCloseRoom = onCloseRoom;
        this.onNewLanGame = onNewLanGame;
        this.onCopyRoomCode = onCopyRoomCode;
        this.container = createElement("section", "local-panel multiplayer-host");
        this.mapContainer = createElement("div", "multiplayer-map-viewport house-map-panel house-map-host");
        this.mapPanel = new HouseMapPanel({
            container: this.mapContainer
        });
    }

    render(model, transition = null) {
        if (model.sessionState === "ACTIVE" || model.sessionState === "GAME_ENDED") {
            this.mapPanel.render(model.houseMapModel, transition);
            this.container.replaceChildren(createActiveHostView(model, this));
            return this.container;
        }

        this.mapPanel.destroy();
        const qr = createElement("div", "multiplayer-join-qr");
        if (model.joinUrl) {
            qr.innerHTML = createQrCodeSvg(model.joinUrl);
            qr.setAttribute("data-join-url", model.joinUrl);
        }
        const joinStage = createElement("section", "multiplayer-join-stage");
        joinStage.setAttribute("data-join-stage", model.roomCode ? "active" : "idle");
        if (model.roomCode) {
            const stageChildren = model.joinUrl
                ? [
                    createElement("h2", "", "Scan to Join"),
                    qr,
                    createElement("p", "local-help", "Players scan this screen, enter a display name, then join.")
                ]
                : [
                    createElement("h2", "", "Preparing QR"),
                    createElement("p", "local-feedback", "Creating a LAN join code for the current room."),
                    createElement("p", "local-help", "If this does not change, refresh the Host page and create a new room.")
                ];
            joinStage.replaceChildren(...stageChildren);
        }
        const canStart = model.lobbyState === "JOINED" &&
            model.sessionState !== "ACTIVE" &&
            !model.startPending &&
            model.canStart;
        const rosterSlots = createRosterSlots(model);

        this.container.replaceChildren(
            createHostHeader(model),
            createHostControls(model, this, canStart),
            createLobbyStage(model, joinStage, rosterSlots)
        );
        return this.container;
    }

    destroy() {
        this.mapPanel.destroy();
        this.container.replaceChildren();
    }
}

function createActiveHostView(model, panel) {
    const ended = model.sessionState === "GAME_ENDED";
    const view = createElement("section", "multiplayer-active-host");
    view.setAttribute("data-host-view", "map");

    const roster = createElement("section", "multiplayer-active-roster");
    roster.replaceChildren(
        createConnectionSummary(model),
        ...createRosterSlots(model, { active: true })
    );

    const controls = createElement("section", "multiplayer-active-host-controls");
    controls.replaceChildren(
        createButton("Close Game", panel.onCloseRoom, {
            disabled: model.lobbyState === "CLOSED"
        }),
        createButton("New LAN Game", panel.onNewLanGame, {
            className: ended ? "local-command multiplayer-primary-action" : "local-command"
        })
    );

    view.replaceChildren(
        createElement("p", "multiplayer-public-kicker", "Betrayal House · Public Map"),
        createMapStage({ ended, mapContainer: panel.mapContainer }),
        roster,
        controls
    );
    return view;
}

function createMapStage({ ended = false, mapContainer } = {}) {
    const map = createElement("section", "multiplayer-public-map");
    const header = createElement("header", "multiplayer-map-header");
    header.replaceChildren(
        createElement("div", "", ended ? "Session Complete" : "Exploration"),
        createElement("h2", "", "House Map"),
        createElement("p", "", ended ? "The game has ended." : "Shared rooms and player positions will appear here.")
    );

    map.replaceChildren(header, mapContainer);
    return map;
}

function createConnectionSummary(model) {
    const reconnecting = model.roster.filter(member =>
        member.connectionState === "RECONNECTING"
    ).length;
    const offline = model.roster.filter(member =>
        member.connectionState === "DISCONNECTED"
    ).length;
    const summary = reconnecting
        ? `${reconnecting} player${reconnecting === 1 ? "" : "s"} reconnecting`
        : offline
            ? `${offline} player${offline === 1 ? "" : "s"} offline`
            : "All players online";
    const stateClass = reconnecting
        ? "reconnecting"
        : offline
            ? "offline"
            : "online";
    const line = createElement("p", `multiplayer-connection-summary ${stateClass}`);
    line.replaceChildren(
        createElement("span", "multiplayer-live-dot"),
        createElement("strong", "", summary)
    );
    return line;
}

function createHostHeader(model) {
    const header = createElement("header", "multiplayer-public-header");
    header.replaceChildren(
        createElement("p", "multiplayer-public-kicker", "LAN Table Host"),
        createElement("h2", "multiplayer-host-title", "Betrayal House"),
        createElement("p", "multiplayer-public-status", model.statusMessage || "Opening the LAN lobby.")
    );
    return header;
}

function createLobbyStage(model, joinStage, rosterSlots) {
    const lobby = createElement("section", "multiplayer-public-lobby");
    if (!model.roomCode) {
        lobby.replaceChildren(
            createElement("h3", "multiplayer-roster-title", "Opening Lobby"),
            createElement("p", "local-help", "Preparing the QR code and player slots.")
        );
        return lobby;
    }
    const board = createElement("section", "multiplayer-public-board");
    board.replaceChildren(
        createElement("h3", "", "Players"),
        createElement("p", "local-feedback", `${model.roster.length}/${model.capacity || model.playerCount || 2} joined`)
    );
    lobby.replaceChildren(
        joinStage,
        board,
        ...rosterSlots
    );
    return lobby;
}

function createHostControls(model, panel, canStart) {
    const controls = createElement("section", "multiplayer-host-controls");
    controls.replaceChildren(
        createButton(model.startPending ? "Starting..." : "Start Session", panel.onStartSession, {
            disabled: !canStart,
            className: "local-command multiplayer-primary-action"
        }),
        createElement("p", "local-help", model.startDisabledReason || ""),
        createButton("Close Room", panel.onCloseRoom, {
            disabled: !model.roomCode || model.lobbyState === "CLOSED"
        })
    );
    return controls;
}

function createRosterSlots(model, { active = false } = {}) {
    const grid = createElement("section", "multiplayer-roster-grid");
    const count = model.capacity || model.playerCount || 2;
    const membersByOrder = new Map(
        model.roster.map(member => [member.joinOrder || 0, member])
    );
    const slots = [];
    for (let index = 1; index <= count; index++) {
        slots.push(createRosterSlot(index, membersByOrder.get(index), { active }));
    }
    grid.replaceChildren(...slots);
    return [grid];
}

function createRosterSlot(index, member, { active = false } = {}) {
    const joined = Boolean(member);
    const ready = member?.readiness === "READY";
    const reconnecting = member?.connectionState === "RECONNECTING";
    const connected = member?.connectionState === "CONNECTED";
    const slot = createElement(
        "article",
        `multiplayer-player-slot ${joined ? "joined" : "empty"} ${ready ? "ready" : ""} ${joined && reconnecting ? "reconnecting" : joined && !connected ? "disconnected" : ""}`
    );
    const name = joined ? member.displayName || `Player ${index}` : `Player ${index}`;
    const detail = joined
        ? member.publicCharacterName || member.publicPlayerName || "Waiting for assignment"
        : "Waiting to join";
    const status = !joined
        ? "OPEN"
        : !connected
            ? reconnecting
                ? "RECONNECTING"
                : "OFFLINE"
            : active
                ? "PLAYING"
            : ready
                ? "READY"
                : "JOINED";

    slot.replaceChildren(
        createElement("div", "multiplayer-player-card-back", joined ? "B" : "+"),
        createElement("p", "multiplayer-player-name", name),
        createElement("p", "local-help", detail),
        createElement("span", "multiplayer-player-status", status)
    );
    return slot;
}
