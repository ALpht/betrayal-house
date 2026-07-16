import { ActionType } from "../scenario/action/ActionType.js";
import { CharacterDefinitions } from "../data/CharacterDefinitions.js";
import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";
import { createLocalGameSession } from "./createLocalGameSession.js";
import { createLocalPlayDebugTools } from "./LocalPlayDebugTools.js";

function el(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

function option(value, text) {
    const node = document.createElement("option");
    node.value = value;
    node.textContent = text;
    return node;
}

function createCharacterSelect(defaultIndex) {
    const select = el("select", "local-control");
    for (const character of CharacterDefinitions) {
        select.appendChild(option(character.id, character.name));
    }
    select.selectedIndex = defaultIndex;
    return select;
}

export function createLocalGameDom({ root }) {
    let session = null;
    const listeners = [];

    root.innerHTML = "";
    root.className = "local-play-shell";

    const setup = el("section", "local-setup");
    const playerOne = createCharacterSelect(0);
    const playerTwo = createCharacterSelect(1);
    const startButton = el("button", "local-command", "New Local Game");
    const restartButton = el("button", "local-command", "Restart");

    setup.append(
        el("h1", "", "Betrayal House"),
        el("span", "local-label", "Player 1"),
        playerOne,
        el("span", "local-label", "Player 2"),
        playerTwo,
        startButton,
        restartButton
    );

    const board = el("main", "local-board");
    const canvas = el("canvas", "local-map");
    const ctx = canvas.getContext("2d");
    const side = el("aside", "local-side");
    const movement = el("section", "local-panel local-movement");
    const payload = el("section", "local-panel local-payload");
    const panels = el("section", "local-panels");

    const status = el("pre", "local-status");
    const turn = el("pre", "local-panel");
    const character = el("pre", "local-panel");
    const action = el("div", "local-panel local-actions");
    const scenario = el("pre", "local-panel");
    const card = el("pre", "local-panel");
    const victory = el("pre", "local-panel");

    const directions = [
        ["north", "North"],
        ["west", "West"],
        ["east", "East"],
        ["south", "South"]
    ];

    movement.appendChild(el("h2", "", "Explore"));
    for (const [direction, label] of directions) {
        const button = el("button", "local-command", label);
        const handler = () => session?.move(direction);
        button.addEventListener("click", handler);
        listeners.push([button, "click", handler]);
        movement.appendChild(button);
    }

    const collectTarget = el("select", "local-control");
    for (const id of ["relic_1", "relic_2", "relic_3"]) {
        collectTarget.appendChild(option(id, id));
    }

    const destroyTarget = el("select", "local-control");
    for (const id of ["cursed_mask_1", "cursed_mask_2"]) {
        destroyTarget.appendChild(option(id, id));
    }

    payload.append(
        el("h2", "", "Action Target"),
        el("span", "local-label", "Collect target"),
        collectTarget,
        el("span", "local-label", "Destroy target"),
        destroyTarget
    );

    panels.append(
        el("h2", "", "Game State"),
        status,
        turn,
        character,
        action,
        scenario,
        card,
        victory
    );

    side.append(movement, payload, panels);
    board.append(canvas, side);
    root.append(setup, board);

    function resizeCanvas() {
        canvas.width = canvas.clientWidth || 800;
        canvas.height = canvas.clientHeight || 600;
    }

    function renderMap() {
        if (!ctx || !session) return;

        resizeCanvas();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#0b0c0f";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const rooms = session.getGraph().getAllRooms();
        const players = session.getPlayerManager().getAllPlayers();
        const size = 96;
        const gap = 22;
        const originX = canvas.width / 2;
        const originY = canvas.height / 2;

        for (const room of rooms) {
            const x = originX + room.x * (size + gap) - size / 2;
            const y = originY + room.y * (size + gap) - size / 2;
            ctx.fillStyle = room.tile.isRevealed ? "#252b35" : "#151922";
            ctx.strokeStyle = "#677083";
            ctx.lineWidth = 2;
            ctx.fillRect(x, y, size, size);
            ctx.strokeRect(x, y, size, size);
            ctx.fillStyle = "#f4f2ee";
            ctx.font = "12px sans-serif";
            ctx.fillText(room.tile.name, x + 8, y + 22);
        }

        players.forEach((player, index) => {
            const room = player.getCurrentRoom();
            if (!room) return;
            const x = originX + room.x * (size + gap) - 18 + index * 22;
            const y = originY + room.y * (size + gap) + 22;
            ctx.fillStyle = player.character.color || "#ffffff";
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function actionInputProvider(type) {
        if (type === ActionType.COLLECT) {
            return {
                itemId: "relic",
                targetId: collectTarget.value
            };
        }

        if (type === ActionType.MOVE) {
            return { destination: "exit" };
        }

        if (type === ActionType.DESTROY) {
            return {
                targetType: "cursedMask",
                targetId: destroyTarget.value,
                target: destroyTarget.value
            };
        }

        return {};
    }

    function startSession() {
        session?.destroy();
        session = createLocalGameSession({
            characterIds: [playerOne.value, playerTwo.value],
            containers: {
                turn,
                character,
                action,
                scenario,
                card,
                victory,
                status
            },
            actionInputProvider
        });
        session.start();
        renderMap();
    }

    const startHandler = () => startSession();
    const restartHandler = () => startSession();
    startButton.addEventListener("click", startHandler);
    restartButton.addEventListener("click", restartHandler);
    listeners.push([startButton, "click", startHandler]);
    listeners.push([restartButton, "click", restartHandler]);

    const refreshMap = () => renderMap();
    EventBus.on(EventTypes.MAP_UPDATED, refreshMap);
    EventBus.on(EventTypes.PLAYER_MOVED, refreshMap);
    EventBus.on(EventTypes.SCENARIO_RUNTIME_CREATED, refreshMap);

    const debugTools = createLocalPlayDebugTools({
        getSession: () => session,
        root
    });

    startSession();

    return {
        getSession: () => session,
        destroy() {
            debugTools.destroy();
            session?.destroy();
            for (const [target, event, handler] of listeners) {
                target.removeEventListener(event, handler);
            }
            EventBus.off(EventTypes.MAP_UPDATED, refreshMap);
            EventBus.off(EventTypes.PLAYER_MOVED, refreshMap);
            EventBus.off(EventTypes.SCENARIO_RUNTIME_CREATED, refreshMap);
            listeners.length = 0;
            root.innerHTML = "";
        }
    };
}
