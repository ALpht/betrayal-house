function freezeMovedPlayer(player) {
    return Object.freeze({ ...player });
}

export class HouseMapTransitionModel {
    constructor({
        revealedRoomIds = [],
        movedPlayers = [],
        previousCurrentPlayerId = null,
        currentPlayerId = null,
        didTurnChange = false,
        isInitialRender = false
    } = {}) {
        this.revealedRoomIds = Object.freeze([...revealedRoomIds]);
        this.movedPlayers = Object.freeze(movedPlayers.map(freezeMovedPlayer));
        this.previousCurrentPlayerId = previousCurrentPlayerId;
        this.currentPlayerId = currentPlayerId;
        this.didTurnChange = Boolean(didTurnChange);
        this.isInitialRender = Boolean(isInitialRender);

        Object.freeze(this);
    }
}
