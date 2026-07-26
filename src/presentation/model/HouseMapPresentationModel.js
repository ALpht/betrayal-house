function freezeRoom(room) {
    return Object.freeze({
        ...room,
        connections: Object.freeze([...(room.connections || [])])
    });
}

function freezePlayer(player) {
    return Object.freeze({ ...player });
}

export class HouseMapPresentationModel {
    constructor({
        rooms = [],
        players = [],
        currentPlayerId = null,
        emptyMessage = "Waiting for the house to be revealed."
    } = {}) {
        this.rooms = Object.freeze(rooms.map(freezeRoom));
        this.players = Object.freeze(players.map(freezePlayer));
        this.currentPlayerId = currentPlayerId;
        this.isEmpty = this.rooms.length === 0;
        this.emptyMessage = emptyMessage;

        Object.freeze(this);
    }
}
