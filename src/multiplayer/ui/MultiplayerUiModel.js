import {
    MultiplayerConnectionState,
    MultiplayerLobbyState,
    MultiplayerMode,
    MultiplayerSessionState
} from "./MultiplayerUiState.js";

const ALLOWED_FIELDS = Object.freeze([
    "mode",
    "connectionState",
    "lobbyState",
    "sessionState",
    "roomCode",
    "role",
    "playerId",
    "playerName",
    "currentPlayerId",
    "currentPlayerName",
    "disabledReason",
    "errorMessage",
    "hasUncertainAction",
    "hostServerAddress",
    "copyMessage",
    "projection",
    "actions",
    "statusMessage",
    "startPending",
    "joinPending",
    "reconnectInProgress"
]);

export function createMultiplayerUiModel(input = {}) {
    const model = {
        mode: input.mode || MultiplayerMode.ENTRY,
        connectionState: input.connectionState || MultiplayerConnectionState.DISCONNECTED,
        lobbyState: input.lobbyState || MultiplayerLobbyState.IDLE,
        sessionState: input.sessionState || MultiplayerSessionState.INACTIVE,
        roomCode: input.roomCode || null,
        role: input.role || null,
        playerId: input.playerId || null,
        playerName: input.playerName || null,
        currentPlayerId: input.currentPlayerId || null,
        currentPlayerName: input.currentPlayerName || null,
        disabledReason: input.disabledReason || null,
        errorMessage: input.errorMessage || null,
        hasUncertainAction: Boolean(input.hasUncertainAction),
        hostServerAddress: input.hostServerAddress || "",
        copyMessage: input.copyMessage || "",
        projection: input.projection || null,
        actions: Array.isArray(input.actions)
            ? input.actions.map(action => Object.freeze({
                type: action.type,
                label: action.label || action.type,
                enabled: Boolean(action.enabled)
            }))
            : [],
        statusMessage: input.statusMessage || "",
        startPending: Boolean(input.startPending),
        joinPending: Boolean(input.joinPending),
        reconnectInProgress: Boolean(input.reconnectInProgress)
    };

    for (const field of Object.keys(model)) {
        if (!ALLOWED_FIELDS.includes(field)) {
            delete model[field];
        }
    }

    return Object.freeze(model);
}

export function getMultiplayerUiModelFields() {
    return [...ALLOWED_FIELDS];
}
