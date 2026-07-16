export class CharacterPresentationModel {
    constructor({ playerName = "No player", characterName = "", stats = {} } = {}) {
        this.playerName = playerName;
        this.characterName = characterName;
        this.stats = Object.freeze({ ...stats });

        Object.freeze(this);
    }
}
