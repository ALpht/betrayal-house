export class CardDeck {

    constructor(cards = []) {

        this.originalCards = [...cards];

        this.cards = [...cards];

        this.discardPile = [];

    }

    draw() {

        return this.cards.length > 0
            ? this.cards.shift()
            : null;

    }

    peek() {

        return this.cards.length > 0
            ? this.cards[0]
            : null;

    }

    discard(card) {

        if (!card) return;

        this.discardPile.push(card);

    }

    shuffle() {

        for (
            let i = this.cards.length - 1;
            i > 0;
            i--
        ) {
            const j =
                Math.floor(
                    Math.random() * (i + 1)
                );

            [
                this.cards[i],
                this.cards[j]
            ] =
            [
                this.cards[j],
                this.cards[i]
            ];
        }

    }

    reset() {

        this.cards = [...this.originalCards];

        this.discardPile = [];

    }

    remaining() {

        return this.cards.length;

    }

    isEmpty() {

        return this.cards.length === 0;

    }

}
