import { ActionButton } from "./ActionButton.js";
import { ActionFactory } from "./ActionFactory.js";
import { ActionDispatcher } from "./ActionDispatcher.js";
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
    #playerId;
    #onAction;
    #buttons;

    constructor({ container, playerId, onAction }) {
        this.#container = container;
        this.#playerId = playerId;
        this.#onAction = onAction;
        this.#buttons = [];
    }

    render(model) {
        this.#clear();

        for (const action of model.actions) {
            const label = ACTION_LABELS[action.type] || action.type;
            const button = new ActionButton({
                label,
                action: action.type,
                disabled: !action.enabled
            });

            button.onClick(() => {
                if (action.enabled && this.#onAction) {
                    const playerAction = this.#createAction(action.type);
                    if (playerAction) {
                        this.#onAction(playerAction);
                    }
                }
            });

            this.#container.appendChild(button.element);
            this.#buttons.push(button);
        }
    }

    destroy() {
        this.#clear();
        this.#buttons = [];
        this.#onAction = null;
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
                return ActionFactory.createDestroy(this.#playerId, "");
            case ActionType.END_TURN:
                return ActionFactory.createEndTurn(this.#playerId);
            default:
                return null;
        }
    }
}