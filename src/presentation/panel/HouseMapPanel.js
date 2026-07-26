const CELL_WIDTH = 176;
const CELL_HEIGHT = 136;
const ROOM_WIDTH = 144;
const ROOM_HEIGHT = 100;

function createElement(tag, className = "", text = "") {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
}

function pairKey(left, right) {
    return [String(left), String(right)].sort().join("::");
}

export class HouseMapPanel {
    #container;

    constructor({ container }) {
        this.#container = container;
    }

    render(model) {
        this.#container.replaceChildren();

        if (!model || model.isEmpty) {
            this.#container.replaceChildren(
                createElement(
                    "p",
                    "house-map-empty",
                    model?.emptyMessage || "Waiting for the house to be revealed."
                )
            );
            return;
        }

        const minX = Math.min(...model.rooms.map(room => room.x));
        const maxX = Math.max(...model.rooms.map(room => room.x));
        const minY = Math.min(...model.rooms.map(room => room.y));
        const maxY = Math.max(...model.rooms.map(room => room.y));
        const columns = maxX - minX + 1;
        const rows = maxY - minY + 1;
        const board = createElement("div", "house-map-board");
        board.style.width = `${columns * CELL_WIDTH}px`;
        board.style.height = `${rows * CELL_HEIGHT}px`;
        board.style.gridTemplateColumns = `repeat(${columns}, ${CELL_WIDTH}px)`;
        board.style.gridTemplateRows = `repeat(${rows}, ${CELL_HEIGHT}px)`;

        const roomsById = new Map(model.rooms.map(room => [room.roomId, room]));
        const connectionLayer = createElement("div", "house-map-connections");
        const renderedPairs = new Set();

        for (const room of model.rooms) {
            for (const connectedRoomId of room.connections) {
                const connected = roomsById.get(connectedRoomId);
                const key = pairKey(room.roomId, connectedRoomId);
                if (!connected || renderedPairs.has(key)) continue;
                renderedPairs.add(key);

                const deltaX = connected.x - room.x;
                const deltaY = connected.y - room.y;
                if (Math.abs(deltaX) + Math.abs(deltaY) !== 1) continue;

                const leftColumn = Math.min(room.x, connected.x) - minX;
                const topRow = Math.min(room.y, connected.y) - minY;
                const line = createElement("span", "house-map-connection");
                line.setAttribute("data-connection", key);
                if (deltaY === 0) {
                    line.className += " horizontal";
                    line.style.left = `${leftColumn * CELL_WIDTH + CELL_WIDTH / 2 + ROOM_WIDTH / 2}px`;
                    line.style.top = `${(room.y - minY) * CELL_HEIGHT + CELL_HEIGHT / 2}px`;
                    line.style.width = `${CELL_WIDTH - ROOM_WIDTH}px`;
                } else {
                    line.className += " vertical";
                    line.style.left = `${(room.x - minX) * CELL_WIDTH + CELL_WIDTH / 2}px`;
                    line.style.top = `${topRow * CELL_HEIGHT + CELL_HEIGHT / 2 + ROOM_HEIGHT / 2}px`;
                    line.style.height = `${CELL_HEIGHT - ROOM_HEIGHT}px`;
                }
                connectionLayer.appendChild(line);
            }
        }
        board.appendChild(connectionLayer);

        for (const room of model.rooms) {
            const tile = createElement("article", "house-map-room");
            tile.setAttribute("data-room-id", room.roomId);
            tile.style.gridColumn = String(room.x - minX + 1);
            tile.style.gridRow = String(room.y - minY + 1);

            const direction = createElement("span", "house-map-direction", "N");
            direction.style.transform = `rotate(${room.rotation}deg)`;
            const title = createElement("strong", "house-map-room-name", room.name);
            const position = createElement(
                "small",
                "house-map-room-position",
                `${room.x}, ${room.y}`
            );
            const markers = createElement("div", "house-map-markers");

            for (const player of model.players.filter(candidate =>
                candidate.roomId === room.roomId
            )) {
                const marker = createElement(
                    "span",
                    `house-map-player${player.isCurrentPlayer ? " current" : ""}`,
                    player.displayName
                );
                marker.setAttribute("data-player-id", player.playerId);
                if (player.isCurrentPlayer) {
                    marker.setAttribute("aria-current", "true");
                    marker.textContent = `${player.displayName} · Current`;
                }
                markers.appendChild(marker);
            }

            tile.replaceChildren(direction, title, position, markers);
            board.appendChild(tile);
        }

        this.#container.replaceChildren(board);
    }

    destroy() {
        this.#container.replaceChildren();
    }
}
