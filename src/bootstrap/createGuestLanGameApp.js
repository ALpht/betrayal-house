import { createMultiplayerGuestBrowser } from "./createMultiplayerGuestBrowser.js";
import { MultiplayerUiController } from "../multiplayer/ui/MultiplayerUiController.js";
import {
    MultiplayerConnectionState,
    MultiplayerLobbyState,
    MultiplayerMode,
    MultiplayerSessionState
} from "../multiplayer/ui/MultiplayerUiState.js";
import { getMultiplayerErrorMessage } from "../multiplayer/ui/MultiplayerErrorMessage.js";
import { createRuntimeId } from "../core/RuntimeId.js";
import { createGuestResumeStore } from "../multiplayer/lobby/GuestResumeStore.js";

const DEFAULT_SERVER_ADDRESS = "http://localhost:3001";

export function createGuestLanGameApp({
    root,
    guestFactory = createMultiplayerGuestBrowser,
    isCurrent = () => true,
    onReturnToHost = () => {},
    initialHostServerAddress = null,
    initialRoomCode = null,
    resumeStoreFactory = createGuestResumeStore
} = {}) {
    let destroyed = false;
    let guest = null;
    const urlDefaults = readJoinDefaults();
    let hostServerAddress = initialHostServerAddress || urlDefaults.hostServerAddress || DEFAULT_SERVER_ADDRESS;
    let roomCode = initialRoomCode || urlDefaults.roomCode || "";
    const persistedResumeStore = resumeStoreFactory({ serverUrl: hostServerAddress });
    let displayName = "Player";
    let ready = false;
    let joinPending = false;
    let reconnectInProgress = false;
    let hasUncertainAction = false;
    let guestSessionUnsubscribe = null;
    let reconnectTimer = null;
    let reconnectAttempts = 0;
    const cleanup = [];

    root.innerHTML = "";
    root.className = "local-play-shell multiplayer-shell";
    const uiRoot = document.createElement("section");
    root.appendChild(uiRoot);

    const controller = new MultiplayerUiController({
        root: uiRoot,
        mode: MultiplayerMode.GUEST,
        actions: {
            onDisplayNameChanged: value => {
                displayName = value;
            },
            onJoin: () => joinRoom(),
            onReady: value => setReady(value),
            onLeave: () => leaveRoom(),
            onReconnect: () => reconnect(),
            onReturn: onReturnToHost,
            onAction: action => sendAction(action)
        }
    });

    function safeUpdate(partial) {
        if (destroyed || !isCurrent()) return;
        controller.update({
            hostServerAddress,
            roomCode,
            displayName,
            ready,
            hasUncertainAction,
            joinPending,
            reconnectInProgress,
            ...partial
        });
    }

    function ensureGuest() {
        if (guest) return guest;
        guest = guestFactory({ url: hostServerAddress });
        const subscribe = guest.onLobbyMessage
            ? handler => guest.onLobbyMessage(handler)
            : handler => guest.lobby.onMessage(handler);
        cleanup.push(subscribe((message, state) => updateFromLobby(message, state)));
        return guest;
    }

    function attachGuestSession() {
        const session = guest?.getGuestSession?.();
        if (!session || guestSessionUnsubscribe) return;
        const applySessionState = state => {
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
        };
        guestSessionUnsubscribe = session.subscribe(applySessionState);
        applySessionState(session.getState());
    }

    function applyTerminalClosure(errorCode = "SESSION_CLOSED") {
        hasUncertainAction = false;
        guestSessionUnsubscribe?.();
        guestSessionUnsubscribe = null;
        const errorMessage = getMultiplayerErrorMessage(errorCode);
        safeUpdate({
            connectionState: MultiplayerConnectionState.DISCONNECTED,
            lobbyState: MultiplayerLobbyState.CLOSED,
            sessionState: MultiplayerSessionState.CLOSED,
            projection: null,
            actions: [],
            playerId: null,
            playerName: null,
            currentPlayerId: null,
            currentPlayerName: null,
            hasUncertainAction,
            statusMessage: "Session closed.",
            errorMessage
        });
    }

    function updateFromLobby(message = null, state = guest?.lobby?.getState?.() || {}) {
        const errorCode = state.error || message?.payload?.code || message?.payload?.reasonCode || null;
        if (message?.type === "SESSION_CLOSED" || state.connectionState === "CLOSED") {
            applyTerminalClosure(errorCode || "SESSION_CLOSED");
            return;
        }
        const disconnectedWithRoom = state.connectionState === "DISCONNECTED" &&
            Boolean(state.roomCode || roomCode) &&
            controller.getModel().lobbyState !== MultiplayerLobbyState.IDLE;
        const connectionState = state.connectionState === "ERROR"
            ? MultiplayerConnectionState.FAILED
            : disconnectedWithRoom
                ? MultiplayerConnectionState.RECONNECTING
            : state.connectionState === "DISCONNECTED"
                ? MultiplayerConnectionState.DISCONNECTED
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
            : disconnectedWithRoom ||
                state.connectionState === "RESUMING" ||
                state.connectionState === "RECONNECTING"
                ? MultiplayerSessionState.RESUMING
                : state.roomCode
                    ? MultiplayerSessionState.WAITING_TO_START
                    : MultiplayerSessionState.INACTIVE;

        attachGuestSession();
        const ownMember = Array.isArray(state.roster)
            ? state.roster.find(member => member.guestId === state.clientId)
            : null;
        ready = ownMember?.readiness === "READY";
        safeUpdate({
            connectionState,
            lobbyState,
            sessionState,
            roomCode: state.roomCode || roomCode || null,
            roster: state.roster || [],
            ready,
            role: state.role || "GUEST",
            playerName: ownMember?.publicCharacterName || ownMember?.publicPlayerName || null,
            statusMessage: errorCode
                ? getMultiplayerErrorMessage(errorCode)
                : sessionState === MultiplayerSessionState.RESUMING
                        ? "Restoring session..."
                        : state.roomCode
                            ? "Waiting for the Host to start the game."
                            : "Scan the Host QR code to join a room.",
            errorMessage: errorCode ? getMultiplayerErrorMessage(errorCode) : null
        });
        if (disconnectedWithRoom) {
            scheduleReconnect();
        }
    }

    async function joinRoom(roomCodeOverride = null) {
        if (joinPending) return null;
        if (roomCodeOverride) {
            roomCode = String(roomCodeOverride).toUpperCase();
        }
        if (!roomCode.trim()) {
            safeUpdate({ errorMessage: "Scan the Host QR code to join a room." });
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
            const result = await activeGuest.joinRoom({
                roomCode: roomCode.trim().toUpperCase(),
                displayName
            });
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
            id: createRuntimeId(`guest-ui-${state.playerId}-${action.type}`),
            type: action.type,
            playerId: state.playerId,
            payload: structuredClone(action.payload || {})
        });
    }

    async function setReady(value) {
        const activeGuest = ensureGuest();
        const result = await activeGuest.setReady(Boolean(value));
        ready = Boolean(value);
        updateFromLobby(result, activeGuest.lobby.getState());
        return result;
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

    async function reconnect({ automatic = false, credential = null } = {}) {
        if (reconnectInProgress) return null;
        clearReconnectTimer();
        let rejectionCode = null;
        reconnectInProgress = true;
        safeUpdate({
            reconnectInProgress,
            sessionState: MultiplayerSessionState.RESUMING,
            statusMessage: "Reconnecting to room..."
        });
        try {
            const result = await guest?.resumeRoom?.(credential);
            if (result?.type === "RESUME_REJECTED") {
                rejectionCode = result.payload?.reasonCode || "RESUME_REJECTED";
                throw new Error(rejectionCode);
            }
            hasUncertainAction = false;
            reconnectAttempts = 0;
            updateFromLobby(result, guest?.lobby?.getState?.() || {});
            return result;
        } catch (_error) {
            if (automatic && !rejectionCode && reconnectAttempts < 25) {
                reconnectAttempts++;
                safeUpdate({
                    connectionState: MultiplayerConnectionState.RECONNECTING,
                    sessionState: MultiplayerSessionState.RESUMING,
                    statusMessage: `Reconnecting to room... (${reconnectAttempts})`
                });
                scheduleReconnect(1000);
            } else {
                safeUpdate({
                    connectionState: MultiplayerConnectionState.FAILED,
                    sessionState: MultiplayerSessionState.CLOSED,
                    errorMessage: getMultiplayerErrorMessage("SESSION_RESUME_FAILED"),
                    statusMessage: "Reconnect failed. Return to Entry or try a new join."
                });
            }
            return null;
        } finally {
            reconnectInProgress = false;
            safeUpdate({ reconnectInProgress, hasUncertainAction });
        }
    }

    async function leaveRoom() {
        clearReconnectTimer();
        await guest?.leaveRoom?.();
        destroyLocal();
        onReturnToHost();
    }

    function destroyLocal() {
        if (destroyed) return;
        destroyed = true;
        clearReconnectTimer();
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
        roomCode,
        displayName,
        statusMessage: roomCode
            ? "Enter your display name to join."
            : "Scan the Host QR code to join a room."
    });
    void resumeStoredRoom();

    async function resumeStoredRoom() {
        if (!roomCode || destroyed) return;
        const credential = persistedResumeStore.read(roomCode);
        if (!credential) return;
        ensureGuest();
        displayName = credential.displayName || displayName;
        safeUpdate({
            displayName,
            lobbyState: MultiplayerLobbyState.JOINED,
            sessionState: MultiplayerSessionState.RESUMING,
            connectionState: MultiplayerConnectionState.RECONNECTING,
            statusMessage: "Restoring your previous player identity..."
        });
        await reconnect({ automatic: true, credential });
    }

    function scheduleReconnect(delayMs = 250) {
        if (destroyed || reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            void reconnect({ automatic: true });
        }, delayMs);
    }

    function clearReconnectTimer() {
        if (!reconnectTimer) return;
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    return {
        getController: () => controller,
        getGuest: () => guest,
        joinRoom,
        leaveRoom,
        reconnect,
        setReady,
        disconnectForReconnect,
        destroy: destroyLocal
    };
}

function readJoinDefaults() {
    if (typeof window === "undefined") {
        return { hostServerAddress: "", roomCode: "" };
    }
    const params = new URL(window.location.href).searchParams;
    return {
        hostServerAddress: params.get("s") || params.get("server") || "",
        roomCode: (params.get("r") || params.get("room") || "").toUpperCase()
    };
}
