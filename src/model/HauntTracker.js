export class HauntTracker {

    constructor() {
        this.#omenCount = 0;
        this.#records = [];
    }

    #omenCount;
    #records;

    trackOmen(card, playerId, roomId) {
        this.#omenCount++;

        const record = {
            card,
            playerId,
            roomId,
            timestamp: Date.now(),
            omenIndex: this.#omenCount
        };

        this.#records.push(record);

        return record;
    }

    getOmenCount() {
        return this.#omenCount;
    }

    getRecords() {
        return [...this.#records];
    }

    reset() {
        this.#omenCount = 0;
        this.#records = [];
    }

    restoreFromSnapshot(records, omenCount) {
        this.#records = [...records];
        this.#omenCount = omenCount;
    }

}
