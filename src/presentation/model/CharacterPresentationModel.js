export class CharacterPresentationModel {

    #playerId;
    #displayName;
    #characterName;
    #currentRoomName;
    #speed;
    #might;
    #sanity;
    #knowledge;
    #inventoryCount;
    #omenCount;
    #lifeState;

    constructor({ playerId, displayName, characterName, currentRoomName,
                  speed, might, sanity, knowledge,
                  inventoryCount, omenCount, lifeState }) {
        this.#playerId = playerId;
        this.#displayName = displayName;
        this.#characterName = characterName;
        this.#currentRoomName = currentRoomName;
        this.#speed = speed;
        this.#might = might;
        this.#sanity = sanity;
        this.#knowledge = knowledge;
        this.#inventoryCount = inventoryCount;
        this.#omenCount = omenCount;
        this.#lifeState = lifeState;
        Object.freeze(this);
    }

    get playerId() { return this.#playerId; }
    get displayName() { return this.#displayName; }
    get characterName() { return this.#characterName; }
    get currentRoomName() { return this.#currentRoomName; }
    get speed() { return this.#speed; }
    get might() { return this.#might; }
    get sanity() { return this.#sanity; }
    get knowledge() { return this.#knowledge; }
    get inventoryCount() { return this.#inventoryCount; }
    get omenCount() { return this.#omenCount; }
    get lifeState() { return this.#lifeState; }

}
