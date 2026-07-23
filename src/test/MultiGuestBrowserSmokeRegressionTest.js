import { createHostLanGameApp } from "../bootstrap/createHostLanGameApp.js";
import { createGuestLanGameApp } from "../bootstrap/createGuestLanGameApp.js";
import { createGameApplication } from "../bootstrap/createGameApplication.js";
import { LobbyClient } from "../multiplayer/lobby/LobbyClient.js";
import { installTestDom, findButton, textOf } from "./TestDom.js";

function createFakeLobby(initialState = {}) {
    const subscribers = new Set();
    let state = {
        connectionState: "CONNECTED",
        roomCode: null,
        role: null,
        roster: [],
        canStart: false,
        playerCount: 2,
        ...initialState
    };

    return {
        onMessage(handler) {
            subscribers.add(handler);
            return () => subscribers.delete(handler);
        },
        getState() {
            return structuredClone(state);
        },
        setState(next) {
            state = { ...state, ...next };
        },
        emit(message = null, next = null) {
            if (next) {
                state = { ...state, ...next };
            }
            for (const subscriber of [...subscribers]) {
                subscriber(message, structuredClone(state));
            }
        }
    };
}

function createFakeGuestSession({ playerId = "player-a" } = {}) {
    const subscribers = new Set();
    const sentActions = [];
    let state = {
        connectionState: "connected",
        playerId,
        revision: 1,
        projection: {
            viewerId: playerId,
            turn: {
                playerId,
                displayName: "Brandon Jaspers",
                isViewerTurn: true
            },
            character: {
                playerId,
                displayName: "Brandon Jaspers"
            },
            scenario: {
                title: "Relic Escape"
            },
            victory: {
                completed: false,
                winner: null,
                reason: null
            },
            cards: [],
            actions: [
                { type: "END_TURN", label: "END_TURN", enabled: true }
            ]
        },
        pendingAction: null
    };

    return {
        subscribe(handler) {
            subscribers.add(handler);
            return () => subscribers.delete(handler);
        },
        getState() {
            return structuredClone(state);
        },
        sendAction(action) {
            sentActions.push(structuredClone(action));
            return true;
        },
        getSentActions() {
            return structuredClone(sentActions);
        },
        emit(next) {
            state = { ...state, ...next };
            for (const subscriber of [...subscribers]) {
                subscriber(structuredClone(state));
            }
        }
    };
}

function createFakeGuestBrowser() {
    const lobby = createFakeLobby({
        clientId: "guest-a",
        role: "GUEST"
    });
    const session = createFakeGuestSession();

    return {
        lobby,
        joinRoom(input) {
            lobby.setState({
                roomCode: input.roomCode,
                connectionState: "ACTIVE",
                role: "GUEST",
                roster: [{
                    guestId: "guest-a",
                    displayName: input.displayName,
                    readiness: "READY",
                    connectionState: "CONNECTED"
                }]
            });
            return Promise.resolve({
                type: "ROOM_JOINED",
                payload: { room: lobby.getState() }
            });
        },
        setReady() {
            return Promise.resolve({
                type: "ROOM_ROSTER_UPDATED",
                payload: { room: lobby.getState() }
            });
        },
        leaveRoom() {
            lobby.emit({
                type: "SESSION_CLOSED",
                payload: { reasonCode: "PLAYER_LEFT_ACTIVE_SESSION" }
            }, {
                connectionState: "CLOSED",
                error: "PLAYER_LEFT_ACTIVE_SESSION"
            });
            return Promise.resolve();
        },
        getGuestSession() {
            return session;
        },
        destroy() {}
    };
}

export async function runMultiGuestBrowserSmokeRegressionTest() {
    console.log("\n===== Multi-Guest Browser Smoke Regression Test =====");
    let passed = 0;
    let failed = 0;

    const assert = (ok, label) => {
        if (ok) {
            passed++;
            console.log(`[PASS] ${label}`);
        } else {
            failed++;
            console.log(`[FAIL] ${label}`);
        }
    };

    installTestDom();
    Object.defineProperty(global, "window", {
        value: { location: { href: "http://192.168.0.182:5173/" } },
        configurable: true
    });

    const hostRoot = document.createElement("div");
    createHostLanGameApp({
        root: hostRoot,
        hostFactory: () => ({
            lobby: createFakeLobby({
                clientId: "host-a",
                role: "HOST",
                roomCode: "ABCD",
                connectionState: "ACTIVE",
                roster: [
                    { guestId: "guest-a", displayName: "Guest A", readiness: "READY", connectionState: "CONNECTED" },
                    { guestId: "guest-b", displayName: "Guest B", readiness: "READY", connectionState: "CONNECTED" }
                ],
                canStart: true
            }),
            createRoom() {},
            activateSession() {},
            closeRoom() {},
            getHostSession: () => null,
            destroy() {}
        })
    });

    assert(
        !textOf(hostRoot).includes("Current Character") &&
            !textOf(hostRoot).includes("Local game started"),
        "Case 1: Host LAN app does not mount local player presentation"
    );

    const guestRoot = document.createElement("div");
    const fakeGuest = createFakeGuestBrowser();
    const guestApp = createGuestLanGameApp({
        root: guestRoot,
        guestFactory: () => fakeGuest
    });

    const labels = [];
    function collectLabels(node) {
        if (!node) return;
        if (node.tagName === "LABEL") labels.push(node);
        for (const child of node.children) collectLabels(child);
    }
    collectLabels(guestRoot);
    const displayNameInput = labels[0]?.children?.find?.(child => child.tagName === "INPUT");
    displayNameInput?.dispatchInput("Guest A");
    assert(
        labels[0]?.children?.includes(displayNameInput),
        "Case 2: Guest text input does not rerender controls while typing"
    );

    await guestApp.joinRoom("ABCD");
    fakeGuest.lobby.emit(null, fakeGuest.lobby.getState());
    const endTurn = findButton(guestRoot, "END_TURN");
    assert(
        endTurn && !endTurn.disabled,
        "Case 3: Current Guest renders enabled action control"
    );
    const guestPanels = guestRoot.children[0]?.children || [];
    const sessionPanelIndex = guestPanels.findIndex?.(panel =>
        panel.className?.includes("multiplayer-session")
    );
    const statusPanelIndex = guestPanels.findIndex?.(panel =>
        panel.className?.includes("multiplayer-status")
    );
    assert(
        sessionPanelIndex >= 0 &&
            statusPanelIndex === -1 &&
            !textOf(guestRoot).includes("RoleGUEST") &&
            !textOf(guestRoot).includes("Reconnect"),
        "Case 3a: Guest shows personal actions without persistent diagnostic controls"
    );

    endTurn?.click();
    const sent = fakeGuest.getGuestSession().getSentActions()[0];
    assert(
        sent?.id &&
            sent.type === "END_TURN" &&
            sent.playerId === "player-a",
        "Case 4: Guest action control sends complete PlayerAction payload"
    );

    fakeGuest.lobby.emit({
        type: "SESSION_CLOSED",
        payload: { reasonCode: "PLAYER_LEFT_ACTIVE_SESSION" }
    }, {
        connectionState: "CLOSED",
        error: "PLAYER_LEFT_ACTIVE_SESSION"
    });
    const terminalText = textOf(guestRoot);
    const terminalCount = (terminalText.match(/A player left the active session\\./g) || []).length;
    assert(
        terminalCount <= 1 &&
            !terminalText.includes("Assigned player: Brandon Jaspers") &&
            !terminalText.includes("Current player: Brandon Jaspers"),
        "Case 5: Active leave clears stale Guest session presentation"
    );

    const socketListeners = new Map();
    const emitted = [];
    const socket = {
        connected: false,
        on(event, handler) {
            socketListeners.set(event, handler);
        },
        once(event, handler) {
            socketListeners.set(event, handler);
        },
        off(event, handler) {
            if (socketListeners.get(event) === handler) {
                socketListeners.delete(event);
            }
        },
        connect() {},
        completeConnect() {
            socket.connected = true;
            socketListeners.get("connect")?.();
        },
        emit(event, payload) {
            emitted.push({ event, payload });
        }
    };
    const lobby = new LobbyClient({
        url: "http://192.168.0.182:3001",
        socket,
        requestTimeoutMs: 1000
    }).connect();
    const joinPromise = lobby.joinRoom({
        roomCode: "ABCD",
        displayName: "Guest A"
    });
    assert(
        emitted.length === 0,
        "Case 6: Join request waits for socket connection before emit"
    );
    socket.completeConnect();
    assert(
        emitted.some(item => item.payload?.type === "JOIN_ROOM"),
        "Case 7: Pending Join request emits after socket connection"
    );
    const joinRequest = emitted.find(item => item.payload?.type === "JOIN_ROOM")?.payload;
    socketListeners.get("lobby:response")?.({
        type: "ROOM_REJECTED",
        requestId: joinRequest?.requestId,
        payload: { code: "ROOM_NOT_FOUND" }
    });
    await joinPromise;
    lobby.destroy();

    Object.defineProperty(global, "window", {
        value: { location: { href: "http://192.168.0.182:5173/?mode=guest&s=http%3A%2F%2F192.168.0.182%3A3001&r=WXYZ" } },
        configurable: true
    });
    const qrRoot = document.createElement("div");
    createGameApplication({
        root: qrRoot,
        localAppFactory: () => ({ destroy() {} }),
        hostAppFactory: () => ({ destroy() {} }),
        guestAppFactory: createGuestLanGameApp
    });
    assert(
        textOf(qrRoot).includes("Join the Table") &&
            findButton(qrRoot, "Join Game") &&
            textOf(qrRoot).includes("Enter your display name to join.") &&
            !textOf(qrRoot).includes("Host Server Address") &&
            !textOf(qrRoot).includes("Room Code"),
        "Case 8: QR join URL opens Guest mode with only display-name entry"
    );

    console.log(`===== Multi-Guest Browser Smoke Regression Test: ${passed} passed, ${failed} failed =====\n`);
}

function findInputValue(node, value) {
    if (!node) return false;
    if (node.tagName === "INPUT" && node.value === value) return true;
    return node.children.some(child => findInputValue(child, value));
}
