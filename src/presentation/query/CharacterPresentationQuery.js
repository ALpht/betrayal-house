import { CharacterPresentationModel } from "../model/CharacterPresentationModel.js";

export class CharacterPresentationQuery {
    #turnManager;

    constructor({ turnManager }) {
        this.#turnManager = turnManager;
    }

    buildModel() {
        const player = this.#turnManager.getCurrentPlayer();
        const character = player?.character || null;

        return new CharacterPresentationModel({
            playerName: character?.name || player?.id || "No player",
            characterName: character?.name || "",
            stats: character?.stats || {}
        });
    }
}
