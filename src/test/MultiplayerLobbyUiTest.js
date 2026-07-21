import { createHostLanGameApp } from "../bootstrap/createHostLanGameApp.js";
import { LobbyConnectionState } from "../multiplayer/lobby/LobbyState.js";
import { findButton, findFirst, installTestDom, textOf } from "./TestDom.js";

function createFakeLobby() {
    const subscribers = new Set();
    const state = {
        connectionState: LobbyConnectionState.CONNECTED,
        clientId: "host-client",
        role: "HOST",
        roomCode: null,
        peerConnected: false,
        error: null
    };
    return {
        onMessage(handler) {
            subscribers.add(handler);
            return () => subscribers.delete(handler);
        },
        getState() {
            return structuredClone(state);
        },
        emit(message = null) {
            for (const subscriber of [...subscribers]) {
                subscriber(message, structuredClone(state));
            }
        },
        state
    };
}

export async function runMultiplayerLobbyUiTest() {
    installTestDom();
    console.log("\n===== Multiplayer Lobby UI Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        const root = document.createElement("section");
        const lobby = createFakeLobby();
        let createCount = 0;
        let startCount = 0;
        let closeCount = 0;
        const host = {
            lobby,
            async createRoom() {
                createCount++;
                lobby.state.roomCode = "ABCD";
                lobby.emit({ type: "ROOM_CREATED", payload: { room: { roomCode: "ABCD" } } });
                return { type: "ROOM_CREATED" };
            },
            async activateSession() {
                startCount++;
                lobby.state.connectionState = LobbyConnectionState.ACTIVE;
                lobby.emit({ type: "SESSION_STARTED", payload: {} });
                return { activation: { type: "SESSION_STARTED" } };
            },
            async closeRoom() {
                closeCount++;
                lobby.state.connectionState = LobbyConnectionState.CLOSED;
                lobby.emit({ type: "SESSION_CLOSED", payload: {} });
                return { type: "SESSION_CLOSED" };
            },
            getHostSession() {
                return null;
            },
            destroy() {}
        };

        const app = createHostLanGameApp({
            root,
            hostFactory: () => host,
            onReturnToEntry: () => {}
        });
        assert(findButton(root, "Create Room") !== null, "Case 1: Host entry renders Create Room action");
        assert(findButton(root, "Start Session")?.disabled === true, "Case 2: Start disabled before Room READY");
        await app.createRoom();
        assert(createCount === 1 && textOf(root).includes("ABCD"), "Case 3: Room Code appears after ROOM_CREATED");
        assert(findFirst(root, node => node.getAttribute?.("data-room-code") === "ABCD") !== null, "Case 4: Room Code remains selectable");

        lobby.state.peerConnected = true;
        lobby.state.connectionState = LobbyConnectionState.READY;
        lobby.emit({ type: "PEER_CONNECTED", payload: {} });
        assert(findButton(root, "Start Session")?.disabled === false, "Case 5: Start enabled after Guest ready");
        await app.startSession();
        await app.startSession();
        assert(startCount === 1, "Case 6: repeated Start click sends one activation request");

        Object.defineProperty(global, "navigator", {
            value: { clipboard: { writeText: () => Promise.reject(new Error("denied")) } },
            configurable: true
        });
        const copied = await findButton(root, "Copy Room Code")?.click?.();
        assert(copied === undefined && textOf(root).includes("ABCD"), "Case 7: Clipboard failure keeps room code visible");
        await app.closeRoom();
        assert(closeCount === 1, "Case 8: Close Room sends close before cleanup");
        app.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Multiplayer Lobby UI threw", error.message);
    }

    console.log(`===== Multiplayer Lobby UI Test: ${passed} passed, ${failed} failed =====\n`);
}
