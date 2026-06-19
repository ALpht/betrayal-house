import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { GameSerializer }
    from "./GameSerializer.js";

const SAVE_KEY =
    "betrayal_house_save";

export class SaveGameController {

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
        storageProvider,
        scenarioRuntime
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
        this.scenarioRuntime =
            scenarioRuntime;

        this.serializer =
            new GameSerializer();

        this.handler =
            this.onSaveRequested
                .bind(this);

        EventBus.on(
            EventTypes.SAVE_GAME_REQUESTED,
            this.handler
        );

    }

    destroy() {

        EventBus.off(
            EventTypes.SAVE_GAME_REQUESTED,
            this.handler
        );

    }

    onSaveRequested(payload) {

        const snapshot =
            this.serializer.toSnapshot(
                this.graph,
                this.playerManager,
                this.turnManager,
                this.gameStateManager,
                this.eventDeck,
                this.itemDeck,
                this.omenDeck,
                this.tileDeck,
                this.hauntTracker,
                this.scenarioRuntime
            );

        this.storageProvider.save(
            SAVE_KEY,
            snapshot
        );

        EventBus.emit(
            EventTypes.GAME_SAVED,
            { timestamp: snapshot.timestamp }
        );

    }

}
