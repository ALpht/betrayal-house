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
const GUEST_MODE_QUERY = "guest";

export function createHostLanGameApp({
    root,
    url = getDefaultServerAddress(),
    hostFactory = createMultiplayerHostBrowser,
    isCurrent = () => true,
    onReturnToEntry = () => {},
    onNewLanGame = () => {}
} = {}) {
    let destroyed = false;
    let startPending = false;
    let playerCount = 2;
    const cleanup = [];

    root.innerHTML = "";
    root.className = "local-play-shell multiplayer-shell";
    const uiRoot = document.createElement("section");
    root.append(uiRoot);

    const host = hostFactory({
        url
    });
    const controller = new MultiplayerUiController({
        root: uiRoot,
        mode: MultiplayerMode.HOST,
        actions: {
            onCreateRoom: value => createRoom(value),
            onPlayerCountChanged: value => {
                playerCount = value;
                safeUpdate({ playerCount });
            },
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
            joinUrl: buildJoinUrl({
                roomCode: state.roomCode,
                lanAddress: state.lanAddress
            }),
            playerCount: state.playerCount || playerCount,
            capacity: state.capacity || state.playerCount || playerCount,
            roster: state.roster || [],
            canStart: Boolean(state.canStart),
            startDisabledReason: state.startDisabledReason,
            role: state.role || "HOST",
            projection: hostSession?.getProjection?.(clientId) || null,
            statusMessage: state.connectionState === "RECONNECTING"
                ? "Guest is reconnecting."
                : state.roster?.length
                    ? `${state.roster.length}/${state.playerCount || playerCount} players joined.`
                    : state.roomCode
                        ? "Waiting for Guest."
                        : "Create a room to begin.",
            errorMessage: errorCode ? getMultiplayerErrorMessage(errorCode) : null,
            startPending
        });
    }

    function buildJoinUrl({ roomCode, lanAddress }) {
        if (!roomCode || typeof window === "undefined") return "";
        const pageUrl = getJoinPageUrl(lanAddress);
        if (!pageUrl) return "";
        const serverUrl = new URL(url, pageUrl.origin);
        serverUrl.hostname = pageUrl.hostname;
        pageUrl.search = "";
        pageUrl.hash = "";
        pageUrl.searchParams.set("mode", GUEST_MODE_QUERY);
        pageUrl.searchParams.set("s", serverUrl.toString().replace(/\/$/, ""));
        pageUrl.searchParams.set("r", String(roomCode).toUpperCase());
        return pageUrl.toString();
    }

    function getJoinPageUrl(lanAddress) {
        const pageUrl = new URL(window.location.href);
        if (!isLoopbackHost(pageUrl.hostname)) return pageUrl;
        if (!lanAddress) return null;
        pageUrl.hostname = lanAddress;
        return pageUrl;
    }

    function isLoopbackHost(hostname) {
        return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    }

    cleanup.push(host.lobby.onMessage((message, state) => updateFromLobby(message, state)));
    updateFromLobby();

    async function createRoom(nextPlayerCount = null) {
        if (nextPlayerCount) {
            playerCount = nextPlayerCount;
        }
        safeUpdate({
            playerCount,
            lobbyState: MultiplayerLobbyState.CREATING,
            statusMessage: "Creating room..."
        });
        const result = await host.createRoom({ playerCount });
        if (!isCurrent() || destroyed) return result;
        updateFromLobby(result, host.lobby.getState());
        return result;
    }

    async function startSession() {
        const state = host.lobby.getState();
        if (startPending || state.connectionState === "ACTIVE" || !state.canStart) return null;
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

function getDefaultServerAddress() {
    if (typeof window === "undefined") return DEFAULT_SERVER_ADDRESS;
    const pageUrl = new URL(window.location.href);
    if (pageUrl.hostname === "localhost" || pageUrl.hostname === "127.0.0.1" || pageUrl.hostname === "::1") {
        return DEFAULT_SERVER_ADDRESS;
    }
    return `${pageUrl.protocol}//${pageUrl.hostname}:3001`;
}
