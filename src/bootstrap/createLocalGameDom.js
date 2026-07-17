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
        el("h1", "", "Betrayal House - Local Play"),
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
    const movementFeedback = el("p", "local-feedback", "Choose a direction to explore or move.");

    movement.appendChild(el("h2", "", "Explore"));
    movement.appendChild(movementFeedback);
    for (const [direction, label] of directions) {
        const button = el("button", "local-command", label);
        const handler = () => {
            const moved = session?.move(direction) || false;
            movementFeedback.textContent = moved
                ? `Moved ${label}.`
                : `${label} is not available from the current room.`;
            renderMap();
        };
        button.addEventListener("click", handler);
        listeners.push([button, "click", handler]);
        movement.appendChild(button);
    }

    const collectTarget = el("select", "local-control");
    for (const [id, label] of [
        ["relic_1", "Relic 1"],
        ["relic_2", "Relic 2"],
        ["relic_3", "Relic 3"]
    ]) {
        collectTarget.appendChild(option(id, label));
    }

    const destroyTarget = el("select", "local-control");
    for (const [id, label] of [
        ["cursed_mask_1", "Cursed Mask 1"],
        ["cursed_mask_2", "Cursed Mask 2"]
    ]) {
        destroyTarget.appendChild(option(id, label));
    }

    payload.append(
        el("h2", "", "Action Target"),
        el("span", "local-label", "Collect action target"),
        collectTarget,
        el("span", "local-label", "Destroy action target"),
        destroyTarget,
        el("p", "local-help", "Targets are static local inputs for the current prototype; action availability still comes from the scenario.")
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
        const currentPlayer = session.getCurrentPlayer();
        const currentRoom = currentPlayer?.getCurrentRoom?.() || null;
        const size = 110;
        const gap = 30;
        const originX = canvas.width / 2;
        const originY = canvas.height / 2;

        for (const room of rooms) {
            const x = originX + room.x * (size + gap) - size / 2;
            const y = originY + room.y * (size + gap) - size / 2;
            const isCurrentRoom = currentRoom?.id === room.id;
            ctx.fillStyle = room.tile.isRevealed ? "#26313f" : "#11151d";
            ctx.strokeStyle = isCurrentRoom ? "#f4c95d" : "#677083";
            ctx.lineWidth = isCurrentRoom ? 4 : 2;
            ctx.fillRect(x, y, size, size);
            ctx.strokeRect(x, y, size, size);
            ctx.fillStyle = "#f4f2ee";
            ctx.font = "13px sans-serif";
            ctx.fillText(room.tile.name, x + 8, y + 24);
            if (isCurrentRoom) {
                ctx.fillStyle = "#f4c95d";
                ctx.font = "11px sans-serif";
                ctx.fillText("Current room", x + 8, y + size - 12);
            }
        }

        players.forEach((player, index) => {
            const room = player.getCurrentRoom();
            if (!room) return;
            const x = originX + room.x * (size + gap) - 18 + index * 22;
            const y = originY + room.y * (size + gap) + 22;
            const isCurrentPlayer = currentPlayer?.id === player.id;
            ctx.fillStyle = player.character.color || "#ffffff";
            ctx.beginPath();
            ctx.arc(x, y, isCurrentPlayer ? 11 : 8, 0, Math.PI * 2);
            ctx.fill();
            if (isCurrentPlayer) {
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2;
                ctx.stroke();
            }
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
        movementFeedback.textContent = `Current player: ${session.getCurrentPlayer()?.name || "Unknown"}.`;
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
