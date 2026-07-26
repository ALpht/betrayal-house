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

function createFeedbackText(model, transition) {
    if (!transition || transition.isInitialRender) return "";
    const messages = [];
    if (transition.revealedRoomIds?.length) {
        messages.push(
            transition.revealedRoomIds.length === 1
                ? "New room revealed"
                : `${transition.revealedRoomIds.length} new rooms revealed`
        );
    }
    for (const movement of transition.movedPlayers || []) {
        const player = model.players.find(
            candidate => candidate.playerId === movement.playerId
        );
        messages.push(player?.displayName
            ? `${player.displayName} moved here`
            : "Moved here");
    }
    if (transition.didTurnChange) {
        const current = model.players.find(
            player => player.playerId === transition.currentPlayerId
        );
        messages.push(current?.displayName
            ? `${current.displayName}'s turn`
            : "Turn changed");
    }
    return messages.join(" · ");
}

export class HouseMapPanel {
    #container;
    #lastRenderSignature = null;
    #hadTransitionFeedback = false;

    constructor({ container }) {
        this.#container = container;
    }

    render(model, transition = null) {
        const signature = JSON.stringify({
            rooms: model?.rooms || [],
            players: model?.players || [],
            currentPlayerId: model?.currentPlayerId ?? null,
            emptyMessage: model?.emptyMessage || null
        });
        const hasTransitionFeedback = Boolean(
            transition &&
            !transition.isInitialRender &&
            (
                transition.revealedRoomIds?.length ||
                transition.movedPlayers?.length ||
                transition.didTurnChange
            )
        );
        if (
            signature === this.#lastRenderSignature &&
            !hasTransitionFeedback &&
            !this.#hadTransitionFeedback &&
            this.#container.children.length > 0
        ) {
            return;
        }
        this.#container.replaceChildren();

        if (!model || model.isEmpty) {
            this.#container.replaceChildren(
                createElement(
                    "p",
                    "house-map-empty",
                    model?.emptyMessage || "Waiting for the house to be revealed."
                )
            );
            this.#lastRenderSignature = signature;
            this.#hadTransitionFeedback = false;
            return;
        }

        const minX = Math.min(...model.rooms.map(room => room.x));
        const maxX = Math.max(...model.rooms.map(room => room.x));
        const minY = Math.min(...model.rooms.map(room => room.y));
        const maxY = Math.max(...model.rooms.map(room => room.y));
        const columns = maxX - minX + 1;
        const rows = maxY - minY + 1;
        const revealedRoomIds = new Set(transition?.revealedRoomIds || []);
        const movements = transition?.movedPlayers || [];
        const movementDestinations = new Set(
            movements.map(movement => movement.toRoomId)
        );
        const movedPlayerIds = new Set(
            movements.map(movement => movement.playerId)
        );
        const board = createElement(
            "div",
            `house-map-board${transition?.didTurnChange ? " house-map-board--turn-changed" : ""}`
        );
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
                if (
                    revealedRoomIds.has(room.roomId) ||
                    revealedRoomIds.has(connectedRoomId)
                ) {
                    line.className += " house-map-connection--revealed";
                }
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
            const roomClasses = ["house-map-room"];
            if (revealedRoomIds.has(room.roomId)) {
                roomClasses.push("house-map-room--revealed");
            }
            if (movementDestinations.has(room.roomId)) {
                roomClasses.push("house-map-room--movement-destination");
            }
            const tile = createElement("article", roomClasses.join(" "));
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
                    [
                        "house-map-player",
                        player.isCurrentPlayer
                            ? "current house-map-player--current"
                            : "",
                        movedPlayerIds.has(player.playerId)
                            ? "house-map-player--moved"
                            : "",
                        transition?.didTurnChange &&
                            player.playerId === transition.currentPlayerId
                            ? "house-map-player--turn-changed"
                            : ""
                    ].filter(Boolean).join(" "),
                    player.displayName
                );
                marker.setAttribute("data-player-id", player.playerId);
                if (player.isCurrentPlayer) {
                    marker.setAttribute("aria-current", "true");
                    marker.textContent = `${player.displayName} · Current`;
                }
                markers.appendChild(marker);
            }

            const feedback = [];
            if (revealedRoomIds.has(room.roomId)) {
                const label = createElement(
                    "span",
                    "house-map-room-feedback house-map-room-feedback--reveal",
                    "New room revealed"
                );
                label.setAttribute("aria-hidden", "true");
                feedback.push(label);
            }
            for (const movement of movements.filter(
                candidate => candidate.toRoomId === room.roomId
            )) {
                const player = model.players.find(
                    candidate => candidate.playerId === movement.playerId
                );
                const label = createElement(
                    "span",
                    "house-map-room-feedback house-map-room-feedback--move",
                    player?.displayName
                        ? `${player.displayName} moved here`
                        : "Moved here"
                );
                label.setAttribute("aria-hidden", "true");
                feedback.push(label);
            }

            tile.replaceChildren(
                direction,
                title,
                position,
                markers,
                ...feedback
            );
            board.appendChild(tile);
        }

        const feedbackText = createFeedbackText(model, transition);
        if (feedbackText) {
            const durationClass = transition.revealedRoomIds?.length
                ? "house-map-live-feedback--reveal"
                : transition.movedPlayers?.length
                    ? "house-map-live-feedback--move"
                    : "house-map-live-feedback--turn";
            const liveRegion = createElement(
                "p",
                `house-map-live-feedback ${durationClass}`,
                feedbackText
            );
            liveRegion.setAttribute("aria-live", "polite");
            liveRegion.setAttribute("role", "status");
            this.#container.replaceChildren(liveRegion, board);
            this.#lastRenderSignature = signature;
            this.#hadTransitionFeedback = true;
            return;
        }
        this.#container.replaceChildren(board);
        this.#lastRenderSignature = signature;
        this.#hadTransitionFeedback = false;
    }

    destroy() {
        this.#container.replaceChildren();
        this.#lastRenderSignature = null;
        this.#hadTransitionFeedback = false;
    }
}
