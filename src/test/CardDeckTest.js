import { createCard }
    from "../model/Card.js";

import { CardDeck }
    from "../model/CardDeck.js";

import { EventDeck }
    from "../model/EventDeck.js";

import { ItemDeck }
    from "../model/ItemDeck.js";

import { OmenDeck }
    from "../model/OmenDeck.js";

const cardData = [
    {
        id: "card_001",
        name: "Creepy Puppet",
        type: "event",
        description: "A strange doll"
    },
    {
        id: "card_002",
        name: "Broken Mirror",
        type: "omen",
        description: "Seven years bad luck"
    },
    {
        id: "card_003",
        name: "Rusty Key",
        type: "item",
        description: "Opens a locked door"
    },
    {
        id: "card_004",
        name: "Mysterious Portrait",
        type: "event",
        description: "Eyes follow you"
    },
    {
        id: "card_005",
        name: "Silver Dagger",
        type: "item",
        description: "A sharp blade"
    }
];

const cards = cardData.map(
    createCard
);

export function runCardDeckTest() {

    console.log(
        "===== CardDeck Test ====="
    );

    /* =========================
     * [CASE 1] Create Deck
     * ========================= */

    const deck = new CardDeck(cards);

    console.log(
        "[CASE 1] Create Deck:",
        deck.remaining() === cards.length
    );

    /* =========================
     * [CASE 2] Draw Card
     * ========================= */

    const deck2 = new CardDeck(cards);

    const drawn =
        deck2.draw();

    console.log(
        "[CASE 2] Draw Card:",
        deck2.remaining() === cards.length - 1
        && drawn.id === cards[0].id
    );

    /* =========================
     * [CASE 3] Peek Card
     * ========================= */

    const deck3 = new CardDeck(cards);

    const peeked =
        deck3.peek();

    console.log(
        "[CASE 3] Peek Card:",
        deck3.remaining() === cards.length
        && peeked.id === cards[0].id
    );

    /* =========================
     * [CASE 4] Discard Card
     * ========================= */

    const deck4 = new CardDeck(cards);

    const discardTarget =
        deck4.draw();

    deck4.discard(discardTarget);

    console.log(
        "[CASE 4] Discard Card:",
        deck4.discardPile.length === 1
        && deck4.discardPile[0].id === discardTarget.id
    );

    /* =========================
     * [CASE 5] Shuffle Deck
     * ========================= */

    const deck5 = new CardDeck(cards);

    const originalIds =
        cards.map(c => c.id).sort();

    deck5.shuffle();

    const shuffledIds =
        deck5.cards.map(c => c.id).sort();

    console.log(
        "[CASE 5] Shuffle Deck:",
        deck5.remaining() === cards.length
        && JSON.stringify(shuffledIds) === JSON.stringify(originalIds)
    );

    /* =========================
     * [CASE 6] Remaining Count
     * ========================= */

    const deck6 = new CardDeck(cards);

    console.log(
        "[CASE 6] Remaining Count:",
        deck6.remaining() === cards.length
    );

    /* =========================
     * [CASE 7] Empty Deck Draw
     * ========================= */

    const deck7 = new CardDeck([]);

    const emptyDraw =
        deck7.draw();

    console.log(
        "[CASE 7] Empty Deck Draw:",
        emptyDraw === null
    );

    /* =========================
     * [CASE 8] Discard Pile
     * ========================= */

    const deck8 = new CardDeck(cards);

    const discards = [];

    for (
        let i = 0;
        i < 3;
        i++
    ) {
        const c = deck8.draw();

        discards.push(c);

        deck8.discard(c);
    }

    console.log(
        "[CASE 8] Discard Pile:",
        deck8.discardPile.length === 3
        && deck8.discardPile[0].id === discards[0].id
        && deck8.discardPile[1].id === discards[1].id
        && deck8.discardPile[2].id === discards[2].id
    );

    /* =========================
     * [CASE 9] Reset Deck
     * ========================= */

    const deck9 = new CardDeck(cards);

    deck9.draw();
    deck9.draw();
    deck9.draw();

    deck9.discard(deck9.draw());

    const afterDraws =
        deck9.remaining();

    deck9.reset();

    console.log(
        "[CASE 9] Reset Deck:",
        deck9.remaining() === cards.length
        && deck9.discardPile.length === 0
        && afterDraws < deck9.remaining()
    );

    /* =========================
     * [CASE 10] Inheritance
     * ========================= */

    const eventDeck =
        new EventDeck(cards);

    const itemDeck =
        new ItemDeck(cards);

    const omenDeck =
        new OmenDeck(cards);

    console.log(
        "[CASE 10] Inheritance:",
        eventDeck instanceof CardDeck
        && itemDeck instanceof CardDeck
        && omenDeck instanceof CardDeck
    );

}
