export class CardPresentationModel {

    #cards;
    #title;
    #emptyMessage;

    constructor({ cards, title, emptyMessage }) {
        this.#cards = Object.freeze(
            cards.map(c => Object.freeze({ ...c }))
        );
        this.#title = title;
        this.#emptyMessage = emptyMessage;
        Object.freeze(this);
    }

    get cards() { return this.#cards; }
    get title() { return this.#title; }
    get emptyMessage() { return this.#emptyMessage; }

}
