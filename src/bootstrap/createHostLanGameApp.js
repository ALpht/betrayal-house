import { createMultiplayerHostBrowser } from "./createMultiplayerHostBrowser.js";
import { MultiplayerUiController } from "../multiplayer/ui/MultiplayerUiController.js";
import {
    MultiplayerConnectionState,
    MultiplayerLobbyState,
    MultiplayerMode,
    MultiplayerSessionState
} from "../multiplayer/ui/MultiplayerUiState.js";
import { getMultiplayerErrorMessage } from "../multiplayer/ui/MultiplayerErrorMessage.js";

const DEFAULT_SERVER_ADDRESS = "http://localhost:3001";

function createPanelContainers(parent) {
    const names = ["turn", "character", "action", "scenario", "card", "victory", "status"];
    const containers = {};
    const section = document.createElement("section");
    section.className = "local-panels multiplayer-gameplay";
    for (const name of names) {
        const node = name === "action"
            ? document.createElement("div")
            : document.createElement("pre");
        node.className = name === "action"
            ? "local-panel local-actions"
            : "local-panel";
        containers[name] = node;
        section.appendChild(node);
    }
    parent.appendChild(section);
    return containers;
}

export function createHostLanGameApp({
    root,
    url = DEFAULT_SERVER_ADDRESS,
    hostFactory = createMultiplayerHostBrowser,
    isCurrent = () => true,
    onReturnToEntry = () => {},
    onNewLanGame = () => {}
} = {}) {
    let destroyed = false;
    let startPending = false;
    const cleanup = [];

    root.innerHTML = "";
    root.className = "local-play-shell multiplayer-shell";
    const uiRoot = document.createElement("section");
    const gameplayRoot = document.createElement("main");
    gameplayRoot.className = "local-board";
    root.append(uiRoot, gameplayRoot);

    const containers = createPanelContainers(gameplayRoot);
    const host = hostFactory({
        url,
        localSessionOptions: { containers }
    });
    const controller = new MultiplayerUiController({
        root: uiRoot,
        mode: MultiplayerMode.HOST,
        actions: {
            onCreateRoom: () => createRoom(),
            onStartSession: () => startSession(),
            onCloseRoom: () => closeRoom(),
            onNewLanGame,
            onCopyRoomCode: () => copyRoomCode()
        }
    });

    function safeUpdate(partial) {
        if (destroyed || !isCurrent()) return;
        controller.update(partial);
    }

    function updateFromLobby(message = null, state = host.lobby.getState()) {
        const errorCode = state.error || message?.payload?.code || message?.payload?.reasonCode || null;
        const peerConnected = Boolean(state.peerConnected);
        const connectionState = state.connectionState === "ERROR"
            ? MultiplayerConnectionState.FAILED
            : state.connectionState === "RECONNECTING"
                ? MultiplayerConnectionState.RECONNECTING
                : state.connectionState === "CLOSED"
                    ? MultiplayerConnectionState.DISCONNECTED
                    : MultiplayerConnectionState.CONNECTED;
        const lobbyState = state.connectionState === "CLOSED"
            ? MultiplayerLobbyState.CLOSED
            : peerConnected
                ? MultiplayerLobbyState.JOINED
                : state.roomCode
                    ? MultiplayerLobbyState.WAITING_FOR_GUEST
                    : MultiplayerLobbyState.IDLE;
        const sessionState = state.connectionState === "ACTIVE"
            ? MultiplayerSessionState.ACTIVE
            : state.connectionState === "RECONNECTING"
                ? MultiplayerSessionState.RESUMING
                : state.roomCode
                    ? MultiplayerSessionState.WAITING_TO_START
                    : MultiplayerSessionState.INACTIVE;

        const hostSession = host.getHostSession?.();
        const clientId = state.clientId;
        safeUpdate({
            connectionState,
            lobbyState,
            sessionState,
            roomCode: state.roomCode,
            role: state.role || "HOST",
            projection: hostSession?.getProjection?.(clientId) || null,
            statusMessage: state.connectionState === "RECONNECTING"
                ? "Guest is reconnecting."
                : peerConnected
                    ? "Guest connected."
                    : state.roomCode
                        ? "Waiting for Guest."
                        : "Create a room to begin.",
            errorMessage: errorCode ? getMultiplayerErrorMessage(errorCode) : null,
            startPending
        });
    }

    cleanup.push(host.lobby.onMessage((message, state) => updateFromLobby(message, state)));
    updateFromLobby();

    async function createRoom() {
        safeUpdate({
            lobbyState: MultiplayerLobbyState.CREATING,
            statusMessage: "Creating room..."
        });
        const result = await host.createRoom();
        if (!isCurrent() || destroyed) return result;
        updateFromLobby(result, host.lobby.getState());
        return result;
    }

    async function startSession() {
        const state = host.lobby.getState();
        if (startPending || state.connectionState === "ACTIVE") return null;
        startPending = true;
        safeUpdate({
            startPending,
            sessionState: MultiplayerSessionState.STARTING,
            statusMessage: "Starting session..."
        });
        try {
            const result = await host.activateSession();
            if (!isCurrent() || destroyed) return result;
            updateFromLobby(result?.activation, host.lobby.getState());
            return result;
        } catch (error) {
            safeUpdate({
                sessionState: MultiplayerSessionState.WAITING_TO_START,
                errorMessage: getMultiplayerErrorMessage("SESSION_START_FAILED")
            });
            return { ok: false, error };
        } finally {
            startPending = false;
            updateFromLobby(null, host.lobby.getState());
        }
    }

    async function closeRoom() {
        const result = await host.closeRoom?.();
        destroyLocal();
        onReturnToEntry();
        return result;
    }

    async function copyRoomCode() {
        const roomCode = host.lobby.getState().roomCode;
        if (!roomCode) return false;
        try {
            await navigator?.clipboard?.writeText?.(roomCode);
            safeUpdate({ copyMessage: "Room code copied." });
            return true;
        } catch (_error) {
            safeUpdate({ copyMessage: "Copy unavailable. Select the room code manually." });
            return false;
        }
    }

    function destroyLocal() {
        if (destroyed) return;
        destroyed = true;
        for (const unsubscribe of cleanup.splice(0)) {
            unsubscribe?.();
        }
        controller.destroy();
        host.destroy();
        root.innerHTML = "";
    }

    return {
        getController: () => controller,
        getHost: () => host,
        createRoom,
        startSession,
        closeRoom,
        destroy: destroyLocal
    };
}
