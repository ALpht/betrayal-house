import { ActionFactory } from "../presentation/ActionFactory.js";
import { ActionType } from "../scenario/action/ActionType.js";
import { PlayerAction } from "../scenario/action/PlayerAction.js";

export class LocalActionInputAdapter {
    #inputProvider;

    constructor({ inputProvider = () => ({}) } = {}) {
        this.#inputProvider = inputProvider;
    }

    createAction(type, playerId) {
        const input = this.#inputProvider(type) || {};

        switch (type) {
            case ActionType.MOVE:
                return ActionFactory.createMove(playerId, input.destination || "exit");

            case ActionType.ATTACK:
                return ActionFactory.createAttack(playerId, input.target || "titan");

            case ActionType.COLLECT: {
                const base = ActionFactory.createCollect(playerId, input.itemId || "relic");
                return this.#withPayload(base, {
                    itemId: input.itemId || "relic",
                    targetId: input.targetId || input.itemTargetId || "relic_1"
                });
            }

            case ActionType.ACTIVATE: {
                const base = ActionFactory.createActivate(playerId, input.altarId || "moon");
                return this.#withPayload(base, {
                    altarId: input.altarId || "moon"
                });
            }

            case ActionType.INTERACT: {
                const base = ActionFactory.createInteract(playerId, input.interactionType || "revealTraitor");
                return this.#withPayload(base, {
                    interactionType: input.interactionType || "revealTraitor"
                });
            }

            case ActionType.DESTROY: {
                const base = ActionFactory.createDestroy(playerId, input.targetId || "cursed_mask_1");
                return this.#withPayload(base, {
                    target: input.target || input.targetId || "npc",
                    targetType: input.targetType || "cursedMask",
                    targetId: input.targetId || "cursed_mask_1"
                });
            }

            case ActionType.END_TURN:
                return ActionFactory.createEndTurn(playerId);

            default:
                return null;
        }
    }

    #withPayload(action, payload) {
        return new PlayerAction({
            id: action.id,
            type: action.type,
            playerId: action.playerId,
            payload
        });
    }
}
