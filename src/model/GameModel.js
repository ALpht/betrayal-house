export class GameModel {

    constructor() {

        this.graphMap = null;

        this.player = null;

        this.gameState =
            GameStates.EXPLORATION;
    }

    setPlayer(player) {
        this.player = player;
    }

    getPlayer() {
        return this.player;
    }
}