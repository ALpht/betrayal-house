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
    "playerCount",
    "capacity",
    "roster",
    "canStart",
    "startDisabledReason",
    "displayName",
    "ready",
    "role",
    "playerId",
    "playerName",
    "currentPlayerId",
    "currentPlayerName",
    "disabledReason",
    "errorMessage",
    "hasUncertainAction",
    "hostServerAddress",
    "joinUrl",
    "copyMessage",
    "projection",
    "houseMapModel",
    "actions",
    "statusMessage",
    "startPending",
    "joinPending",
    "reconnectInProgress"
]);

export function createMultiplayerUiModel(input = {}) {
    const model = {
        mode: input.mode || MultiplayerMode.HOST,
        connectionState: input.connectionState || MultiplayerConnectionState.DISCONNECTED,
        lobbyState: input.lobbyState || MultiplayerLobbyState.IDLE,
        sessionState: input.sessionState || MultiplayerSessionState.INACTIVE,
        roomCode: input.roomCode || null,
        playerCount: input.playerCount || 2,
        capacity: input.capacity || input.playerCount || 2,
        roster: Array.isArray(input.roster)
            ? input.roster.map(member => Object.freeze({
                guestId: member.guestId || null,
                displayName: member.displayName || "",
                membershipState: member.membershipState || "",
                connectionState: member.connectionState || "",
                readiness: member.readiness || "",
                joinOrder: member.joinOrder || 0,
                playerId: member.playerId || null,
                publicCharacterId: member.publicCharacterId || null,
                publicPlayerName: member.publicPlayerName || null,
                publicCharacterName: member.publicCharacterName || null
            }))
            : [],
        canStart: Boolean(input.canStart),
        startDisabledReason: input.startDisabledReason || null,
        displayName: input.displayName || "",
        ready: Boolean(input.ready),
        role: input.role || null,
        playerId: input.playerId || null,
        playerName: input.playerName || null,
        currentPlayerId: input.currentPlayerId || null,
        currentPlayerName: input.currentPlayerName || null,
        disabledReason: input.disabledReason || null,
        errorMessage: input.errorMessage || null,
        hasUncertainAction: Boolean(input.hasUncertainAction),
        hostServerAddress: input.hostServerAddress || "",
        joinUrl: input.joinUrl || "",
        copyMessage: input.copyMessage || "",
        projection: input.projection || null,
        houseMapModel: input.houseMapModel || null,
        actions: Array.isArray(input.actions)
            ? input.actions.map(action => Object.freeze({
                type: action.type,
                label: action.label || action.type,
                enabled: Boolean(action.enabled),
                payload: Object.freeze({ ...(action.payload || {}) })
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
