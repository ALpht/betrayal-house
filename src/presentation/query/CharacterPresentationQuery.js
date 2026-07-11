import { CharacterPresentationModel } from '../model/CharacterPresentationModel.js';

/**
 * Current Active Character Query
 *
 * Current implementation queries the active player
 * through TurnManager.
 *
 * Future multiplayer may introduce
 * player-targeted queries.
 */

const EMPTY_MODEL = new CharacterPresentationModel({
    playerId: null,
    displayName: "",
    characterName: "",
    currentRoomName: null,
    speed: 0,
    might: 0,
    sanity: 0,
    knowledge: 0,
    inventoryCount: 0,
    omenCount: 0,
    lifeState: "Unknown"
});

export class CharacterPresentationQuery {

    #turnManager;

    constructor({ turnManager }) {
        this.#turnManager = turnManager;
    }

    buildModel(runtime) {
        if (!runtime) {
            return EMPTY_MODEL;
        }

        const player = this.#turnManager?.getCurrentPlayer();
        if (!player) {
            return EMPTY_MODEL;
        }

        return new CharacterPresentationModel({
            playerId: player.id,
            displayName: player.character?.name ?? "Unknown",
            characterName: player.character?.name ?? "Unknown",
            currentRoomName: player.currentRoom?.tile?.name ?? null,
            speed: player.stats.speed,
            might: player.stats.might,
            sanity: player.stats.sanity,
            knowledge: player.stats.knowledge,
            inventoryCount: player.items.length,
            omenCount: player.omens.length,
            lifeState: player.isAlive ? "Alive" : "Defeated"
        });
    }

}
