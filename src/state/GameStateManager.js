import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";

export const GAME_STATE = {
    EXPLORATION: "EXPLORATION",
    HAUNT: "HAUNT"
};

class GameStateManagerClass {

    constructor() {
        this.current = GAME_STATE.EXPLORATION;
    }

    getState() {
        return this.current;
    }

    setState(state) {

        if (this.current === state) {
            return;
        }

        this.current = state;

        EventBus.emit(
            EventTypes.GAME_STATE_CHANGED,
            state
        );
    }

    isExploration() {
        return this.current === GAME_STATE.EXPLORATION;
    }

    isHaunt() {
        return this.current === GAME_STATE.HAUNT;
    }

    triggerHaunt() {

        this.setState(
            GAME_STATE.HAUNT
        );

        EventBus.emit(
            EventTypes.HAUNT_TRIGGERED
        );
    }
}

export const GameStateManager = new GameStateManagerClass();