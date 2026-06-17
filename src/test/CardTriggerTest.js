import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { GraphMap }
    from "../model/GraphMap.js";

import { RoomNode }
    from "../model/RoomNode.js";

import { RoomTile }
    from "../model/RoomTile.js";

import { CardDeck }
    from "../model/CardDeck.js";

import { CardTriggerController }
    from "../controller/CardTriggerController.js";

function createMockDeck(cards) {

    return new CardDeck(cards);

}

function makeRoom(graph, id, x, y, name, triggerType, exits) {

    const room =
        new RoomNode(
            id,
            new RoomTile(
                id,
                name,
                exits,
                triggerType
            ),
            x,
            y
        );

    graph.addRoom(room);

    return room;
}

function fireRoomRevealed(
    graph,
    x,
    y,
    playerId = 'player_001'
) {

    const room =
        graph.getRoom(x, y);

    if (!room) return;

    room.tile.isRevealed = true;

    EventBus.emit(
        EventTypes.ROOM_REVEALED,
        {
            roomId: room.id,
            roomName: room.tile.name,
            x: room.x,
            y: room.y,
            playerId
        }
    );

}

function buildTestGraph() {

    const graph = new GraphMap();

    makeRoom(
        graph, 0, 0, 0,
        "Entrance Hall",
        null,
        {
            north: true,
            east: false,
            south: false,
            west: false
        }
    );

    makeRoom(
        graph, 1, 1, 0,
        "Chapel",
        'event',
        {
            north: false,
            east: true,
            south: false,
            west: true
        }
    );

    makeRoom(
        graph, 2, 1, 1,
        "Armory",
        'item',
        {
            north: false,
            east: false,
            south: true,
            west: true
        }
    );

    makeRoom(
        graph, 3, 0, 1,
        "Crypt",
        'omen',
        {
            north: true,
            east: false,
            south: false,
            west: false
        }
    );

    return graph;
}

const eventCard = {
    id: 'event_test',
    type: 'event',
    name: 'Test Event',
    description: 'A test event card.',
    tags: ['test'],
    expansion: 'base',
    rarity: 'common'
};

const itemCard = {
    id: 'item_test',
    type: 'item',
    name: 'Test Item',
    description: 'A test item card.',
    tags: ['test'],
    expansion: 'base',
    rarity: 'common'
};

const omenCard = {
    id: 'omen_test',
    type: 'omen',
    name: 'Test Omen',
    description: 'A test omen card.',
    tags: ['test'],
    expansion: 'base',
    rarity: 'common'
};

export function runCardTriggerTest() {

    console.log(
        "===== Card Trigger Test ====="
    );

    /* =========================
     * [CASE 1] Reveal Event Room
     * ========================= */

    EventBus.clear();

    const graph1 = buildTestGraph();

    const ctrl1 =
        new CardTriggerController(
            graph1,
            createMockDeck([
                { ...eventCard }
            ]),
            createMockDeck([]),
            createMockDeck([])
        );

    const eventDrawn = [];

    const handler1 =
        payload => {

            eventDrawn.push(payload);

        };

    EventBus.on(
        EventTypes.CARD_DRAWN,
        handler1
    );

    fireRoomRevealed(
        graph1,
        1,
        0
    );

    EventBus.off(
        EventTypes.CARD_DRAWN,
        handler1
    );

    console.log(
        "[CASE 1] Reveal Event Room:",
        eventDrawn.length === 1
        && eventDrawn[0].card.type === 'event'
        && eventDrawn[0].triggerType === 'event'
    );

    ctrl1.destroy();

    /* =========================
     * [CASE 2] Reveal Item Room
     * ========================= */

    EventBus.clear();

    const graph2 = buildTestGraph();

    const ctrl2 =
        new CardTriggerController(
            graph2,
            createMockDeck([]),
            createMockDeck([
                { ...itemCard }
            ]),
            createMockDeck([])
        );

    const itemDrawn = [];

    const handler2 =
        payload => {

            itemDrawn.push(payload);

        };

    EventBus.on(
        EventTypes.CARD_DRAWN,
        handler2
    );

    fireRoomRevealed(
        graph2,
        1,
        1
    );

    EventBus.off(
        EventTypes.CARD_DRAWN,
        handler2
    );

    console.log(
        "[CASE 2] Reveal Item Room:",
        itemDrawn.length === 1
        && itemDrawn[0].card.type === 'item'
    );

    ctrl2.destroy();

    /* =========================
     * [CASE 3] Reveal Omen Room
     * ========================= */

    EventBus.clear();

    const graph3 = buildTestGraph();

    const ctrl3 =
        new CardTriggerController(
            graph3,
            createMockDeck([]),
            createMockDeck([]),
            createMockDeck([
                { ...omenCard }
            ])
        );

    const omenDrawn = [];

    const handler3 =
        payload => {

            omenDrawn.push(payload);

        };

    EventBus.on(
        EventTypes.CARD_DRAWN,
        handler3
    );

    fireRoomRevealed(
        graph3,
        0,
        1
    );

    EventBus.off(
        EventTypes.CARD_DRAWN,
        handler3
    );

    console.log(
        "[CASE 3] Reveal Omen Room:",
        omenDrawn.length === 1
        && omenDrawn[0].card.type === 'omen'
    );

    ctrl3.destroy();

    /* =========================
     * [CASE 4] CARD_DRAW_REQUESTED Fired
     * ========================= */

    EventBus.clear();

    const graph4 = buildTestGraph();

    const ctrl4 =
        new CardTriggerController(
            graph4,
            createMockDeck([
                { ...eventCard }
            ]),
            createMockDeck([]),
            createMockDeck([])
        );

    const requests = [];

    EventBus.on(
        EventTypes.CARD_DRAW_REQUESTED,
        payload => {

            requests.push(payload);

        }
    );

    fireRoomRevealed(
        graph4,
        1,
        0
    );

    console.log(
        "[CASE 4] CARD_DRAW_REQUESTED Fired:",
        requests.length >= 1
        && requests[0].deckType === 'event'
        && requests[0].playerId === 'player_001'
        && requests[0].roomId !== undefined
    );

    ctrl4.destroy();

    /* =========================
     * [CASE 5] CARD_DRAWN Payload
     * ========================= */

    EventBus.clear();

    const graph5 = buildTestGraph();

    const ctrl5 =
        new CardTriggerController(
            graph5,
            createMockDeck([
                { ...eventCard }
            ]),
            createMockDeck([]),
            createMockDeck([])
        );

    const drawnCards = [];

    EventBus.on(
        EventTypes.CARD_DRAWN,
        payload => {

            drawnCards.push(payload);

        }
    );

    fireRoomRevealed(
        graph5,
        1,
        0
    );

    const lastDraw =
        drawnCards[0];

    console.log(
        "[CASE 5] CARD_DRAWN Payload:",
        lastDraw.deckType !== undefined
        && lastDraw.triggerType !== undefined
        && lastDraw.playerId !== undefined
        && lastDraw.roomId !== undefined
        && lastDraw.cardId !== undefined
        && lastDraw.card !== undefined
    );

    ctrl5.destroy();

    /* =========================
     * [CASE 6] Card Removed From Deck
     * ========================= */

    EventBus.clear();

    const graph6 = buildTestGraph();

    const freshDeck =
        createMockDeck([
            { ...eventCard }
        ]);

    const ctrl6 =
        new CardTriggerController(
            graph6,
            freshDeck,
            createMockDeck([]),
            createMockDeck([])
        );

    const before =
        freshDeck.remaining();

    fireRoomRevealed(
        graph6,
        1,
        0
    );

    console.log(
        "[CASE 6] Card Removed From Deck:",
        before === 1
        && freshDeck.remaining() === 0
    );

    ctrl6.destroy();

    /* =========================
     * [CASE 7] No Trigger On null triggerType
     * ========================= */

    EventBus.clear();

    const graph7 = buildTestGraph();

    const ctrl7 =
        new CardTriggerController(
            graph7,
            createMockDeck([
                { ...eventCard }
            ]),
            createMockDeck([]),
            createMockDeck([])
        );

    const noDraw = [];

    EventBus.on(
        EventTypes.CARD_DRAWN,
        payload => {

            noDraw.push(payload);

        }
    );

    fireRoomRevealed(
        graph7,
        0,
        0
    );

    console.log(
        "[CASE 7] No Trigger On null:",
        noDraw.length === 0
    );

    ctrl7.destroy();

    /* =========================
     * [CASE 8] Empty Deck Handling
     * ========================= */

    EventBus.clear();

    const graph8 = buildTestGraph();

    const emptyDeck =
        createMockDeck([]);

    const ctrl8 =
        new CardTriggerController(
            graph8,
            emptyDeck,
            createMockDeck([]),
            createMockDeck([])
        );

    let emptySafe = true;

    try {

        fireRoomRevealed(
            graph8,
            1,
            0
        );

    }
    catch (e) {

        emptySafe = false;

    }

    ctrl8.destroy();

    console.log(
        "[CASE 8] Empty Deck Handling:",
        emptySafe
    );

     /* =========================
      * [CASE 9] Multiple ROOM_REVEALED Events
      * ========================= */

    EventBus.clear();

    const graph9 = buildTestGraph();

    const multiDeck =
        createMockDeck([
            { ...eventCard },
            {
                ...eventCard,
                id: 'event_test_2'
            }
        ]);

    const ctrl9 =
        new CardTriggerController(
            graph9,
            multiDeck,
            createMockDeck([]),
            createMockDeck([])
        );

    fireRoomRevealed(
        graph9,
        1,
        0
    );

    fireRoomRevealed(
        graph9,
        1,
        0
    );

    console.log(
        "[CASE 9] Multiple ROOM_REVEALED Events:",
        multiDeck.remaining() === 0
    );

    ctrl9.destroy();

    /* =========================
     * [CASE 10] EventBus Cleanup
     * ========================= */

    EventBus.clear();

    const graph10 = buildTestGraph();

    const ctrl10 =
        new CardTriggerController(
            graph10,
            createMockDeck([
                { ...eventCard }
            ]),
            createMockDeck([]),
            createMockDeck([])
        );

    const beforeCount =
        EventBus.listeners
        && EventBus.listeners.size
            ? (
                EventBus.listeners
                    .get(
                        EventTypes.ROOM_REVEALED
                    )
                    ?.length || 0
            )
            : 0;

    ctrl10.destroy();

    const afterCount =
        EventBus.listeners
        && EventBus.listeners.size
            ? (
                EventBus.listeners
                    .get(
                        EventTypes.ROOM_REVEALED
                    )
                    ?.length || 0
            )
            : 0;

    console.log(
        "[CASE 10] EventBus Cleanup:",
        afterCount < beforeCount
    );

    /* =========================
     * Final Cleanup
     * ========================= */

    EventBus.clear();

    console.log(
        "===== Card Trigger Test Complete ====="
    );

}
