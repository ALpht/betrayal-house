import { EventBus }
    from '../core/EventBus.js';

import { EventTypes }
    from '../core/EventTypes.js';

export class TurnManager {

    #players;

    #currentIndex;

    #started;

    constructor() {

        this.#players = [];

        this.#currentIndex = 0;

        this.#started = false;

    }

    start(players) {

        if (!players?.length) {

            throw new Error(
                'TurnManager requires players'
            );

        }

        this.#players = players;

        this.#currentIndex = 0;

        this.#started = true;

        this.#emitTurnChanged();

    }

    hasStarted() {

        return this.#started;

    }

    getCurrentPlayer() {

        if (!this.#started) {

            return null;

        }

        return this.#players[
            this.#currentIndex
        ];

    }

    getCurrentPlayerIndex() {

        if (!this.#started) {

            return -1;

        }

        return this.#currentIndex;

    }

    nextTurn() {

        if (!this.#started) {

            throw new Error(
                'TurnManager has not started'
            );

        }

        this.#currentIndex =
            (
                this.#currentIndex + 1
            )
            %
            this.#players.length;

            this.#emitTurnChanged();

    }

    isCurrentPlayer(player) {

        if (!this.#started) {

            return false;

        }

        return (
            this.getCurrentPlayer().id
            ===
            player.id
        );

    }

    #emitTurnChanged() {

        const player =
            this.getCurrentPlayer();

        EventBus.emit(

            EventTypes.TURN_CHANGED,

            {

                currentPlayerId:
                    player.id,

                turnIndex:
                    this.#currentIndex

            }

        );

    }
}