import { EventDefinitions }
    from "../data/EventDefinitions.js";

import { ItemDefinitions }
    from "../data/ItemDefinitions.js";

import { OmenDefinitions }
    from "../data/OmenDefinitions.js";

import { EventDeck }
    from "../model/EventDeck.js";

import { ItemDeck }
    from "../model/ItemDeck.js";

import { OmenDeck }
    from "../model/OmenDeck.js";

const VALID_TYPES = [
    'event',
    'item',
    'omen'
];

const REQUIRED_FIELDS = [
    'id',
    'type',
    'name',
    'description',
    'tags',
    'expansion',
    'rarity'
];

function hasRequiredFields(card) {

    return REQUIRED_FIELDS
        .every(
            field => card[field] !== undefined
                && card[field] !== null
        );

}

export function runCardDataTest() {

    console.log(
        "===== Card Data Test ====="
    );

    /* =========================
     * [CASE 1] EventDefinitions Exists
     * ========================= */

    console.log(
        "[CASE 1] EventDefinitions Exists:",
        EventDefinitions.length > 0
    );

    /* =========================
     * [CASE 2] ItemDefinitions Exists
     * ========================= */

    console.log(
        "[CASE 2] ItemDefinitions Exists:",
        ItemDefinitions.length > 0
    );

    /* =========================
     * [CASE 3] OmenDefinitions Exists
     * ========================= */

    console.log(
        "[CASE 3] OmenDefinitions Exists:",
        OmenDefinitions.length > 0
    );

    /* =========================
     * [CASE 4] Create Event Deck
     * ========================= */

    let deck = new EventDeck(
        EventDefinitions
    );

    const eventDeckCreated =
        deck.remaining() === EventDefinitions.length;

    console.log(
        "[CASE 4] Create Event Deck:",
        eventDeckCreated
    );

    /* =========================
     * [CASE 5] Create Item Deck
     * ========================= */

    deck = new ItemDeck(
        ItemDefinitions
    );

    const itemDeckCreated =
        deck.remaining() === ItemDefinitions.length;

    console.log(
        "[CASE 5] Create Item Deck:",
        itemDeckCreated
    );

    /* =========================
     * [CASE 6] Create Omen Deck
     * ========================= */

    deck = new OmenDeck(
        OmenDefinitions
    );

    const omenDeckCreated =
        deck.remaining() === OmenDefinitions.length;

    console.log(
        "[CASE 6] Create Omen Deck:",
        omenDeckCreated
    );

    /* =========================
     * [CASE 7] All Cards Have ID
     * ========================= */

    const allCards = [
        ...EventDefinitions,
        ...ItemDefinitions,
        ...OmenDefinitions
    ];

    const allHaveId = allCards
        .every(
            card => card.id
                && typeof card.id === 'string'
        );

    console.log(
        "[CASE 7] All Cards Have ID:",
        allHaveId
    );

    /* =========================
     * [CASE 8] Type Exists
     * ========================= */

    const allHaveType = allCards
        .every(
            card => card.type
                && typeof card.type === 'string'
        );

    console.log(
        "[CASE 8] Type Exists:",
        allHaveType
    );

    /* =========================
     * [CASE 9] No Duplicate IDs
     * ========================= */

    const ids = allCards
        .map(c => c.id);

    const uniqueIds = new Set(ids);

    console.log(
        "[CASE 9] No Duplicate IDs:",
        uniqueIds.size === ids.length
    );

    /* =========================
     * [CASE 10] Required Fields
     * ========================= */

    const allHaveRequired = allCards
        .every(hasRequiredFields);

    console.log(
        "[CASE 10] Required Fields:",
        allHaveRequired
    );

    /* =========================
     * [CASE 11] Valid Type Value
     * ========================= */

    const allValidTypes = allCards
        .every(
            card => VALID_TYPES
                .includes(card.type)
        );

    console.log(
        "[CASE 11] Valid Type Value:",
        allValidTypes
    );

    /* =========================
     * [CASE 12] Tags Must Be Array
     * ========================= */

    const allTagsAreArray = allCards
        .every(
            card => Array.isArray(card.tags)
        );

    console.log(
        "[CASE 12] Tags Must Be Array:",
        allTagsAreArray
    );

}