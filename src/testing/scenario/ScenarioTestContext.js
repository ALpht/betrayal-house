import { ScenarioContext }
    from "../../scenario/runtime/ScenarioContext.js";

class FakePlayerManager {
    #players = [];

    addPlayer(player) {
        this.#players.push(player);
    }

    getAllPlayers() {
        return [...this.#players];
    }

    getPlayer(playerId) {
        return this.#players.find(
            p => p.id === playerId
        );
    }

    getPlayerCount() {
        return this.#players.length;
    }

    clear() {
        this.#players = [];
    }
}

class FakeGameState {
    #state = "HAUNT";
    #traitorPlayerId = null;

    getState() {
        return this.#state;
    }

    setState(state) {
        this.#state = state;
    }

    isExploration() {
        return this.#state === "EXPLORATION";
    }

    isHaunt() {
        return this.#state === "HAUNT";
    }

    getTraitorPlayerId() {
        return this.#traitorPlayerId;
    }

    setTraitorPlayerId(id) {
        this.#traitorPlayerId = id;
    }
}

class FakeGraphMap {
    #rooms = new Map();

    addRoom(room) {
        this.#rooms.set(room.id, room);
    }

    getRoom(roomId) {
        return this.#rooms.get(roomId);
    }

    getAllRooms() {
        return [...this.#rooms.values()];
    }

    hasRoom(roomId) {
        return this.#rooms.has(roomId);
    }

    clear() {
        this.#rooms.clear();
    }
}

class FakeCardManager {
    eventDeck = {};
    itemDeck = {};
    omenDeck = {};
}

export class ScenarioTestContext {
    static create(overrides = {}) {
        const players =
            overrides.players
            ?? new FakePlayerManager();

        const gameState =
            overrides.gameState
            ?? new FakeGameState();

        const graphMap =
            overrides.graphMap
            ?? new FakeGraphMap();

        const cardManager =
            overrides.cardManager
            ?? new FakeCardManager();

        return new ScenarioContext({
            players,
            gameState,
            graphMap,
            cardManager
        });
    }
}
