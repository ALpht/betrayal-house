import { ActionButton } from "./ActionButton.js";
import { ActionAvailability } from "./ActionAvailability.js";
import { ActionDispatcher } from "./ActionDispatcher.js";
import { ActionFactory } from "./ActionFactory.js";
import { ActionType } from "../scenario/action/ActionType.js";

const ACTION_LABELS = Object.freeze({
    [ActionType.MOVE]: "Move",
    [ActionType.ATTACK]: "Attack",
    [ActionType.COLLECT]: "Collect",
    [ActionType.ACTIVATE]: "Activate",
    [ActionType.INTERACT]: "Interact",
    [ActionType.DESTROY]: "Destroy",
    [ActionType.USE_ITEM]: "Use Item",
    [ActionType.END_TURN]: "End Turn"
});

export class ActionPanel {
    #container;
    #runtime;
    #playerId;
    #buttons;

    constructor({ container, runtime, playerId }) {
        this.#container = container;
        this.#runtime = runtime;
        this.#playerId = playerId;
        this.#buttons = [];
    }

    render() {
        this.#clear();

        const types = ActionAvailability.getActions(this.#runtime);

        for (const type of types) {
            const label = ACTION_LABELS[type] || type;
            const button = new ActionButton({ label, action: type });

            button.onClick(() => {
                const action = this.#createAction(type);
                if (action) {
                    ActionDispatcher.dispatch(this.#runtime, action);
                }
            });

            this.#container.appendChild(button.element);
            this.#buttons.push(button);
        }
    }

    destroy() {
        this.#clear();
        this.#buttons = [];
        this.#runtime = null;
    }

    #clear() {
        for (const b of this.#buttons) {
            b.remove();
        }
        this.#buttons = [];
    }

    #createAction(type) {
        switch (type) {
            case ActionType.MOVE:
                return ActionFactory.createMove(this.#playerId, "");
            case ActionType.ATTACK:
                return ActionFactory.createAttack(this.#playerId, "");
            case ActionType.COLLECT:
                return ActionFactory.createCollect(this.#playerId, "");
            case ActionType.ACTIVATE:
                return ActionFactory.createActivate(this.#playerId, "");
            case ActionType.INTERACT:
                return ActionFactory.createInteract(this.#playerId, "");
            case ActionType.DESTROY:
                return ActionFactory.createAttack(this.#playerId, "");
            case ActionType.END_TURN:
                return ActionFactory.createEndTurn(this.#playerId);
            default:
                return null;
        }
    }
}
