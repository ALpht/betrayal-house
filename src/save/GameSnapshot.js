export const SNAPSHOT_VERSION = "1.0.0";

export class GameSnapshot {

    constructor(data) {
        this.version = SNAPSHOT_VERSION;
        this.timestamp = new Date().toISOString();
        this.gameState = data.gameState;
        this.rooms = data.rooms;
        this.players = data.players;
        this.turnManager = data.turnManager;
        this.decks = data.decks;
        this.hauntTracker = data.hauntTracker;
    }

}
