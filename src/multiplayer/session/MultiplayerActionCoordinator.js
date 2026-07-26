import { PlayerAction } from "../../scenario/action/PlayerAction.js";

export const ActionResultReasonCode = Object.freeze({
    IDENTITY_MISMATCH: "IDENTITY_MISMATCH",
    DUPLICATE_SEQUENCE: "DUPLICATE_SEQUENCE",
    ACTION_REJECTED: "ACTION_REJECTED",
    GAME_ENDED: "GAME_ENDED",
    SESSION_DESTROYED: "SESSION_DESTROYED"
});

function acceptedResult(sequence, shouldPublish = true) {
    return {
        sequence,
        accepted: true,
        reasonCode: null,
        shouldPublish
    };
}

function rejectedResult(sequence, reasonCode) {
    return {
        sequence,
        accepted: false,
        reasonCode,
        shouldPublish: false
    };
}

function toPlayerAction(payload) {
    return new PlayerAction({
        id: payload?.id,
        type: payload?.type,
        playerId: payload?.playerId,
        payload: payload?.payload || {}
    });
}

export class MultiplayerActionCoordinator {
    #getPlayerBinding;
    #executeAuthoritativeAction;
    #isGameEnded;
    #lastConsumedSequenceByClient;

    constructor({
        getPlayerBinding,
        executeAuthoritativeAction,
        isGameEnded = () => false
    }) {
        this.#getPlayerBinding = getPlayerBinding;
        this.#executeAuthoritativeAction = executeAuthoritativeAction;
        this.#isGameEnded = isGameEnded;
        this.#lastConsumedSequenceByClient = new Map();
    }

    handleGuestAction({ senderId, sequence, actionPayload }) {
        const binding = this.#getPlayerBinding(senderId);
        if (!binding) {
            return rejectedResult(sequence, ActionResultReasonCode.IDENTITY_MISMATCH);
        }

        if (actionPayload?.playerId !== binding.playerId) {
            return rejectedResult(sequence, ActionResultReasonCode.IDENTITY_MISMATCH);
        }

        const lastConsumed =
            this.#lastConsumedSequenceByClient.get(binding.clientId) || 0;

        if (sequence <= lastConsumed) {
            return rejectedResult(sequence, ActionResultReasonCode.DUPLICATE_SEQUENCE);
        }

        let action;
        try {
            action = toPlayerAction(actionPayload);
        } catch (_error) {
            return rejectedResult(sequence, ActionResultReasonCode.ACTION_REJECTED);
        }

        this.#lastConsumedSequenceByClient.set(binding.clientId, sequence);

        if (this.#isGameEnded()) {
            return rejectedResult(sequence, ActionResultReasonCode.GAME_ENDED);
        }

        try {
            const result = this.#executeAuthoritativeAction(action);
            if (result?.accepted === true) {
                return acceptedResult(
                    sequence,
                    result.shouldPublish !== false
                );
            }

            return rejectedResult(
                sequence,
                result?.reasonCode || ActionResultReasonCode.ACTION_REJECTED
            );
        } catch (_error) {
            return rejectedResult(sequence, ActionResultReasonCode.ACTION_REJECTED);
        }
    }

    getLastConsumedSequence(clientId) {
        return this.#lastConsumedSequenceByClient.get(clientId) || 0;
    }
}
