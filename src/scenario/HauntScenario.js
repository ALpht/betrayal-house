export class HauntScenario {

    static meta = {};

    getMeta() {
        return this.constructor.meta;
    }

    start(context) {}

    onTurnStart(context) {}

    onTurnEnd(context) {}

    update(context) {}

    checkVictory(context) {
        return null;
    }

}
