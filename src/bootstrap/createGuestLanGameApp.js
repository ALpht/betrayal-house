import { createMultiplayerGuestBrowser } from "./createMultiplayerGuestBrowser.js";
import { MultiplayerUiController } from "../multiplayer/ui/MultiplayerUiController.js";
import {
    MultiplayerConnectionState,
    MultiplayerLobbyState,
    MultiplayerMode,
    MultiplayerSessionState
} from "../multiplayer/ui/MultiplayerUiState.js";
import { getMultiplayerErrorMessage } from "../multiplayer/ui/MultiplayerErrorMessage.js";

const DEFAULT_SERVER_ADDRESS = "http://localhost:3001";

export function createGuestLanGameApp({
    root,
    guestFactory = createMultiplayerGuestBrowser,
    isCurrent = () => true,
    onReturnToEntry = () => {}
} = {}) {
    let destroyed = false;
    let guest = null;
    let hostServerAddress = DEFAULT_SERVER_ADDRESS;
    let roomCode = "";
    let joinPending = false;
    let reconnectInProgress = false;
    let hasUncertainAction = false;
    let guestSessionUnsubscribe = null;
    const cleanup = [];

    root.innerHTML = "";
    root.className = "local-play-shell multiplayer-shell";
    const uiRoot = document.createElement("section");
    root.appendChild(uiRoot);

    const controller = new MultiplayerUiController({
        root: uiRoot,
        mode: MultiplayerMode.GUEST,
        actions: {
            onAddressChanged: value => {
                hostServerAddress = value;
                safeUpdate({ hostServerAddress });
            },
            onRoomCodeChanged: value => {
                roomCode = value;
            },
            onJoin: () => joinRoom(),
            onLeave: () => leaveRoom(),
            onReconnect: () => reconnect(),
            onReturn: onReturnToEntry,
            onAction: action => sendAction(action)
        }
    });

    function safeUpdate(partial) {
        if (destroyed || !isCurrent()) return;
        controller.update({
            hostServerAddress,
            hasUncertainAction,
            joinPending,
            reconnectInProgress,
            ...partial
        });
    }

    function ensureGuest() {
        if (guest) return guest;
        guest = guestFactory({ url: hostServerAddress });
        cleanup.push(guest.lobby.onMessage((message, state) => updateFromLobby(message, state)));
        return guest;
    }

    function attachGuestSession() {
        const session = guest?.getGuestSession?.();
        if (!session || guestSessionUnsubscribe) return;
        guestSessionUnsubscribe = session.subscribe(state => {
            const projection = state.projection || null;
            safeUpdate({
                connectionState: state.connectionState === "connected"
                    ? MultiplayerConnectionState.CONNECTED
                    : MultiplayerConnectionState.DISCONNECTED,
                sessionState: projection
                    ? MultiplayerSessionState.ACTIVE
                    : MultiplayerSessionState.RESUMING,
                projection,
                hasUncertainAction,
                statusMessage: projection ? "Session active." : "Restoring the latest game state."
            });
        });
    }

    function updateFromLobby(message = null, state = guest?.lobby?.getState?.() || {}) {
        const errorCode = state.error || message?.payload?.code || message?.payload?.reasonCode || null;
        const connectionState = state.connectionState === "ERROR"
            ? MultiplayerConnectionState.FAILED
            : state.connectionState === "RESUMING" || state.connectionState === "RECONNECTING"
                ? MultiplayerConnectionState.RECONNECTING
                : state.connectionState === "CLOSED"
                    ? MultiplayerConnectionState.DISCONNECTED
                    : MultiplayerConnectionState.CONNECTED;
        const lobbyState = state.error
            ? MultiplayerLobbyState.REJECTED
            : state.roomCode
                ? MultiplayerLobbyState.JOINED
                : MultiplayerLobbyState.IDLE;
        const sessionState = state.connectionState === "ACTIVE"
            ? MultiplayerSessionState.STARTING
            : state.connectionState === "RESUMING" || state.connectionState === "RECONNECTING"
                ? MultiplayerSessionState.RESUMING
                : state.roomCode
                    ? MultiplayerSessionState.WAITING_TO_START
                    : MultiplayerSessionState.INACTIVE;

        attachGuestSession();
        safeUpdate({
            connectionState,
            lobbyState,
            sessionState,
            roomCode: state.roomCode || roomCode || null,
            role: state.role || "GUEST",
            statusMessage: errorCode
                ? getMultiplayerErrorMessage(errorCode)
                : sessionState === MultiplayerSessionState.RESUMING
                    ? "Restoring session..."
                    : state.roomCode
                        ? "Waiting for the Host to start the game."
                        : "Enter the Host server address and room code.",
            errorMessage: errorCode ? getMultiplayerErrorMessage(errorCode) : null
        });
    }

    async function joinRoom(roomCodeOverride = null) {
        if (joinPending) return null;
        if (roomCodeOverride) {
            roomCode = String(roomCodeOverride).toUpperCase();
        }
        if (!roomCode.trim()) {
            safeUpdate({ errorMessage: getMultiplayerErrorMessage("INVALID_ROOM_CODE") });
            return null;
        }
        joinPending = true;
        safeUpdate({
            joinPending,
            lobbyState: MultiplayerLobbyState.JOINING,
            statusMessage: "Joining room..."
        });
        try {
            const activeGuest = ensureGuest();
            const result = await activeGuest.joinRoom(roomCode.trim().toUpperCase());
            if (!isCurrent() || destroyed) return result;
            updateFromLobby(result, activeGuest.lobby.getState());
            return result;
        } finally {
            joinPending = false;
            updateFromLobby(null, guest?.lobby?.getState?.() || {});
        }
    }

    function sendAction(action) {
        const session = guest?.getGuestSession?.();
        if (!session || !action?.enabled) return false;
        const state = session.getState();
        return session.sendAction({
            type: action.type,
            playerId: state.playerId,
            payload: {}
        });
    }

    function disconnectForReconnect() {
        const pendingAction = guest?.getGuestSession?.()?.getPendingAction?.();
        hasUncertainAction = Boolean(pendingAction);
        guest?.disconnectForReconnect?.();
        safeUpdate({
            connectionState: MultiplayerConnectionState.RECONNECTING,
            sessionState: MultiplayerSessionState.RESUMING,
            hasUncertainAction,
            statusMessage: "Connection lost. Reconnecting to the Host."
        });
    }

    async function reconnect() {
        if (reconnectInProgress) return null;
        reconnectInProgress = true;
        safeUpdate({
            reconnectInProgress,
            sessionState: MultiplayerSessionState.RESUMING,
            statusMessage: "Reconnecting to room..."
        });
        try {
            const result = await guest?.resumeRoom?.();
            hasUncertainAction = false;
            updateFromLobby(result, guest?.lobby?.getState?.() || {});
            return result;
        } catch (_error) {
            safeUpdate({
                connectionState: MultiplayerConnectionState.FAILED,
                sessionState: MultiplayerSessionState.CLOSED,
                errorMessage: getMultiplayerErrorMessage("SESSION_RESUME_FAILED"),
                statusMessage: "Reconnect failed. Return to Entry or try a new join."
            });
            return null;
        } finally {
            reconnectInProgress = false;
            safeUpdate({ reconnectInProgress, hasUncertainAction });
        }
    }

    async function leaveRoom() {
        await guest?.leaveRoom?.();
        destroyLocal();
        onReturnToEntry();
    }

    function destroyLocal() {
        if (destroyed) return;
        destroyed = true;
        guestSessionUnsubscribe?.();
        guestSessionUnsubscribe = null;
        for (const unsubscribe of cleanup.splice(0)) {
            unsubscribe?.();
        }
        controller.destroy();
        guest?.destroy?.();
        guest = null;
        root.innerHTML = "";
    }

    safeUpdate({
        hostServerAddress,
        statusMessage: "Enter the Host server address and room code."
    });

    return {
        getController: () => controller,
        getGuest: () => guest,
        joinRoom,
        leaveRoom,
        reconnect,
        disconnectForReconnect,
        destroy: destroyLocal
    };
}
