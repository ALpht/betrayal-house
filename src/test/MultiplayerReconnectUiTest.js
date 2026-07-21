import { createGuestLanGameApp } from "../bootstrap/createGuestLanGameApp.js";
import { LobbyConnectionState } from "../multiplayer/lobby/LobbyState.js";
import { installTestDom, textOf } from "./TestDom.js";

function createFakeGuest() {
    const lobbySubscribers = new Set();
    const sessionSubscribers = new Set();
    const lobbyState = {
        connectionState: LobbyConnectionState.CONNECTED,
        role: "GUEST",
        roomCode: null,
        error: null
    };
    let pendingAction = null;
    const session = {
        subscribe(handler) {
            sessionSubscribers.add(handler);
            return () => sessionSubscribers.delete(handler);
        },
        getState() {
            return {
                playerId: "guest-player",
                connectionState: "connected",
                projection: null
            };
        },
        getPendingAction() {
            return pendingAction;
        },
        sendAction() {
            pendingAction = { sequence: 1, type: "COLLECT" };
            return true;
        }
    };
    const lobby = {
        onMessage(handler) {
            lobbySubscribers.add(handler);
            return () => lobbySubscribers.delete(handler);
        },
        getState() {
            return structuredClone(lobbyState);
        },
        emit(message) {
            for (const subscriber of [...lobbySubscribers]) {
                subscriber(message, structuredClone(lobbyState));
            }
        }
    };

    return {
        lobby,
        joinRoom(roomCode) {
            lobbyState.roomCode = roomCode;
            lobby.emit({ type: "ROOM_JOINED", payload: {} });
            return Promise.resolve({ type: "ROOM_JOINED" });
        },
        resumeRoom() {
            lobbyState.connectionState = LobbyConnectionState.RESUMING;
            lobby.emit({ type: "ROOM_RESUMED", payload: {} });
            pendingAction = null;
            for (const subscriber of [...sessionSubscribers]) {
                subscriber({
                    playerId: "guest-player",
                    connectionState: "connected",
                    projection: {
                        turn: { playerId: "guest-player", displayName: "Ox", isViewerTurn: true },
                        character: { playerId: "guest-player", displayName: "Ox" },
                        actions: [],
                        victory: { completed: false }
                    }
                });
            }
            return Promise.resolve({ type: "ROOM_RESUMED" });
        },
        disconnectForReconnect() {},
        leaveRoom() {
            lobbyState.connectionState = LobbyConnectionState.CLOSED;
            lobby.emit({ type: "SESSION_CLOSED", payload: {} });
            return Promise.resolve({ type: "SESSION_CLOSED" });
        },
        getGuestSession() {
            return session;
        },
        destroy() {}
    };
}

export async function runMultiplayerReconnectUiTest() {
    installTestDom();
    console.log("\n===== Multiplayer Reconnect UI Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        const root = document.createElement("section");
        const fakeGuest = createFakeGuest();
        const app = createGuestLanGameApp({
            root,
            guestFactory: () => fakeGuest,
            onReturnToEntry: () => {}
        });

        await app.joinRoom.call(app, "ABCD");
        app.disconnectForReconnect();
        assert(textOf(root).includes("Connection lost. Reconnecting to the Host."), "Case 1: Disconnect moves Guest UI to reconnecting");
        assert(!textOf(root).includes("may or may not"), "Case 2: No uncertain warning without pending action");

        fakeGuest.getGuestSession().sendAction();
        app.disconnectForReconnect();
        assert(textOf(root).includes("may or may not"), "Case 3: Uncertain warning requires pending Action");
        await app.reconnect();
        assert(textOf(root).includes("Ox"), "Case 4: Resume success restores active projection");
        assert(!textOf(root).includes("may or may not"), "Case 5: Resume clears uncertain warning");
        await app.leaveRoom();
        assert(textOf(root) === "", "Case 6: Explicit leave cleans Guest app");
        app.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Multiplayer Reconnect UI threw", error.message);
    }

    console.log(`===== Multiplayer Reconnect UI Test: ${passed} passed, ${failed} failed =====\n`);
}
