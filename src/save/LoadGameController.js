import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { GameDeserializer }
    from "./GameDeserializer.js";

const SAVE_KEY =
    "betrayal_house_save";

export class LoadGameController {

    constructor(
        graph,
        playerManager,
        turnManager,
        gameStateManager,
        eventDeck,
        itemDeck,
        omenDeck,
        tileDeck,
        hauntTracker,
        storageProvider
    ) {

        this.graph = graph;
        this.playerManager = playerManager;
        this.turnManager = turnManager;
        this.gameStateManager =
            gameStateManager;
        this.eventDeck = eventDeck;
        this.itemDeck = itemDeck;
        this.omenDeck = omenDeck;
        this.tileDeck = tileDeck;
        this.hauntTracker = hauntTracker;
        this.storageProvider =
            storageProvider;

        this.deserializer =
            new GameDeserializer();

        this.handler =
            this.onLoadRequested
                .bind(this);

        EventBus.on(
            EventTypes.LOAD_GAME_REQUESTED,
            this.handler
        );

    }

    destroy() {

        EventBus.off(
            EventTypes.LOAD_GAME_REQUESTED,
            this.handler
        );

    }

    onLoadRequested(payload) {

        const raw =
            this.storageProvider.load(
                SAVE_KEY
            );

        if (!raw) {

            console.warn(
                "[LOAD] No save data found"
            );

            return;

        }

        this.deserializer.fromSnapshot(

            raw,

            this.graph,
            this.playerManager,
            this.turnManager,
            this.gameStateManager,
            this.eventDeck,
            this.itemDeck,
            this.omenDeck,
            this.tileDeck,
            this.hauntTracker

        );

        EventBus.emit(
            EventTypes.GAME_LOADED,
            { timestamp: raw.timestamp }
        );

    }

}
