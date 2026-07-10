import { HauntScenario }
    from "../HauntScenario.js";

import { EventBus }
    from "../../core/EventBus.js";

import { EventTypes }
    from "../../core/EventTypes.js";

export class EscapeTheHouseScenario
    extends HauntScenario {

    static meta = {
        id: "escapeTheHouse",
        traitorRule: "random"
    };

    #entranceRoomId = null;
    #handler = null;

    start(context, state) {

        super.start(context, state);

        if (
            !state.has("escapedPlayers")
        ) {

            state.set(
                "escapedPlayers",
                []
            );

        }

        const entranceHall =
            context.graphMap
                .getAllRooms()
                .find(
                    r =>
                        r.tile.id === 0
                );

        this.#entranceRoomId =
            entranceHall?.id;

        const handler = (payload) => {

            if (
                payload.toRoomId
                !== this.#entranceRoomId
            ) {
                return;
            }

            const escaped =
                state.get(
                    "escapedPlayers"
                ) || [];

            if (
                !escaped.includes(
                    payload.playerId
                )
            ) {

                escaped.push(
                    payload.playerId
                );

                state.set(
                    "escapedPlayers",
                    escaped
                );

            }

        };

        this.#handler = handler;

        EventBus.on(
            EventTypes.PLAYER_MOVED,
            handler
        );

    }

    destroy() {

        super.destroy?.();

        if (this.#handler) {

            EventBus.off(
                EventTypes.PLAYER_MOVED,
                this.#handler
            );

            this.#handler = null;

        }

    }

}
