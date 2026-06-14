// src/model/PlayerManager.js

export class PlayerManager {

    #players = [];

    addPlayer(player) {

        this.#players.push(player);

    }

    removePlayer(playerId) {

        this.#players =
            this.#players.filter(
                p => p.id !== playerId
            );

    }

    getPlayer(playerId) {

        return this.#players.find(
            p => p.id === playerId
        );

    }

    getAllPlayers() {

        return [...this.#players];

    }

}