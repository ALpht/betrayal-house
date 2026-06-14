export class PlayerManager {

    #players = [];

    addPlayer(player) {
        this.#players.push(player);
    }

    removePlayer(playerId) {
        this.#players =
            this.#players.filter(
                player => player.id !== playerId
            );
    }

    getPlayer(playerId) {
        return this.#players.find(
            player => player.id === playerId
        );
    }

    getAllPlayers() {
        return [...this.#players];
    }

    getPlayerCount() {
        return this.#players.length;
    }

    findByCharacterId(characterId) {
        return this.#players.find(p => p.character.id === characterId);
    }
}