import { createHostLanGameApp } from "../bootstrap/createHostLanGameApp.js";
import { LobbyConnectionState } from "../multiplayer/lobby/LobbyState.js";
import { findButton, findFirst, installTestDom, textOf } from "./TestDom.js";

function createFakeLobby() {
    const subscribers = new Set();
    const state = {
        connectionState: LobbyConnectionState.CONNECTED,
        clientId: "host-client",
        lanAddress: "192.168.50.24",
        socketServerPort: 3001,
        role: "HOST",
        roomCode: null,
        peerConnected: false,
        playerCount: 2,
        capacity: 2,
        roster: [],
        canStart: false,
        startDisabledReason: "ROSTER_INCOMPLETE",
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
        Object.defineProperty(global, "window", {
            value: { location: { href: "http://192.168.0.182:5173/" } },
            configurable: true
        });
        const root = document.createElement("section");
        const lobby = createFakeLobby();
        let createCount = 0;
        let startCount = 0;
        let closeCount = 0;
        const publicSession = {
            getPublicProjection() {
                return {
                    map: {
                        rooms: [{
                            roomId: 0,
                            name: "Entrance Hall",
                            x: 0,
                            y: 0,
                            rotation: 0,
                            isRevealed: true,
                            connections: []
                        }],
                        players: [
                            { playerId: "brandon", displayName: "Brandon Jaspers", roomId: 0 },
                            { playerId: "ox", displayName: "Ox Bellows", roomId: 0 }
                        ],
                        currentPlayerId: "brandon"
                    }
                };
            },
            subscribePublicProjection() {
                return () => {};
            }
        };
        const host = {
            lobby,
            async createRoom() {
                createCount++;
                lobby.state.roomCode = "ABCD";
                lobby.emit({ type: "ROOM_CREATED", payload: { room: { roomCode: "ABCD", playerCount: 2 } } });
                return { type: "ROOM_CREATED" };
            },
            async activateSession() {
                startCount++;
                lobby.state.connectionState = LobbyConnectionState.ACTIVE;
                lobby.emit({ type: "SESSION_STARTED", payload: {} });
                return {
                    activation: { type: "SESSION_STARTED" },
                    hostSession: publicSession
                };
            },
            async closeRoom() {
                closeCount++;
                lobby.state.connectionState = LobbyConnectionState.CLOSED;
                lobby.emit({ type: "SESSION_CLOSED", payload: {} });
                return { type: "SESSION_CLOSED" };
            },
            getHostSession() {
                return lobby.state.connectionState === LobbyConnectionState.ACTIVE
                    ? publicSession
                    : null;
            },
            destroy() {}
        };

        const app = createHostLanGameApp({
            root,
            hostFactory: () => host,
            onReturnToHost: () => {}
        });
        assert(
            createCount === 1 &&
                findButton(root, "2 Players") === null &&
                findButton(root, "3 Players") === null,
            "Case 1: Host opens the default lobby without a setup page"
        );
        assert(findButton(root, "Start Session")?.disabled === true, "Case 2: Start disabled before Room READY");
        assert(
            createCount === 1 && textOf(root).includes("Scan to Join"),
            "Case 3: QR join stage appears from automatic room creation"
        );
        assert(findButton(root, "Copy Room Code") === null, "Case 4: Room Code copy control is not rendered");
        const joinQr = findFirst(root, node => node.getAttribute?.("data-join-url")?.includes("mode=guest"));
        assert(
            joinQr?.getAttribute("data-join-url")?.includes("s=http%3A%2F%2F192.168.0.182%3A3001") &&
                joinQr?.getAttribute("data-join-url")?.includes("r=ABCD"),
            "Case 5: Host renders QR join URL with LAN server address and room code"
        );
        assert(
            findFirst(root, node => node.getAttribute?.("data-join-stage") === "active") !== null,
            "Case 5a: Host renders central scan stage after room creation"
        );

        lobby.state.peerConnected = true;
        lobby.state.canStart = true;
        lobby.state.startDisabledReason = null;
        lobby.state.roster = [
            { guestId: "guest-a", displayName: "A", connectionState: "CONNECTED", readiness: "READY", joinOrder: 1, publicCharacterName: "Brandon Jaspers" },
            { guestId: "guest-b", displayName: "B", connectionState: "CONNECTED", readiness: "READY", joinOrder: 2, publicCharacterName: "Ox Bellows" }
        ];
        lobby.emit({ type: "ROOM_ROSTER_UPDATED", payload: { room: lobby.state } });
        assert(findButton(root, "Start Session")?.disabled === false, "Case 6: Start enabled after Guest ready");
        await app.startSession();
        await app.startSession();
        assert(startCount === 1, "Case 7: repeated Start click sends one activation request");

        Object.defineProperty(global, "navigator", {
            value: { clipboard: { writeText: () => Promise.reject(new Error("denied")) } },
            configurable: true
        });
        const activeHostText = textOf(root);
        assert(
            activeHostText.includes("House Map") &&
                activeHostText.includes("Entrance Hall") &&
                activeHostText.includes("Brandon Jaspers") &&
                activeHostText.includes("Ox Bellows"),
            "Case 8: Active Host switches to the public map and keeps connection assignments"
        );
        assert(
            findFirst(root, node => node.getAttribute?.("data-host-view") === "map") !== null,
            "Case 8-map: Active Host exposes the dedicated map stage"
        );
        assert(
            !activeHostText.includes("Scan to Join") &&
                findFirst(root, node => node.getAttribute?.("data-join-url")) === null &&
                findButton(root, "Start Session") === null,
            "Case 8a: Active Host removes QR and lobby-only controls"
        );
        lobby.state.roster[0].connectionState = "RECONNECTING";
        lobby.emit({ type: "ROOM_ROSTER_UPDATED", payload: { room: lobby.state } });
        assert(
            textOf(root).includes("1 player reconnecting") &&
                textOf(root).includes("RECONNECTING") &&
                !textOf(root).includes("Scan to Join"),
            "Case 8b: Active Host monitors reconnecting players without returning to the QR lobby"
        );
        lobby.state.roster[0].connectionState = "CONNECTED";
        lobby.emit({ type: "ROOM_ROSTER_UPDATED", payload: { room: lobby.state } });
        assert(
            textOf(root).includes("All players online") &&
                textOf(root).includes("PLAYING"),
            "Case 8c: Host returns the same player slot to online after resume"
        );
        await app.closeRoom();
        assert(closeCount === 1, "Case 9: Close Room sends close before cleanup");
        app.destroy();

        const newGameRoot = document.createElement("section");
        const newGameLobby = createFakeLobby();
        let newGameCloseCount = 0;
        let newGameCallbackCount = 0;
        const newGameHost = {
            lobby: newGameLobby,
            async createRoom() {
                newGameLobby.state.roomCode = "NEXT";
                newGameLobby.emit({ type: "ROOM_CREATED", payload: {} });
                return { type: "ROOM_CREATED" };
            },
            async closeRoom() {
                newGameCloseCount++;
                return { type: "SESSION_CLOSED" };
            },
            getHostSession() {
                return null;
            },
            destroy() {}
        };
        const newGameApp = createHostLanGameApp({
            root: newGameRoot,
            hostFactory: () => newGameHost,
            onNewLanGame: () => {
                newGameCallbackCount++;
            }
        });
        await newGameApp.newLanGame();
        assert(
            newGameCloseCount === 1 && newGameCallbackCount === 1,
            "Case 10: New LAN Game closes the old room before opening a fresh Host lobby"
        );

        Object.defineProperty(global, "window", {
            value: { location: { href: "http://localhost:5173/" } },
            configurable: true
        });
        const localhostRoot = document.createElement("section");
        const localhostLobby = createFakeLobby();
        localhostLobby.state.lanAddress = "192.168.50.24";
        const localhostHost = {
            lobby: localhostLobby,
            async createRoom() {
                localhostLobby.state.roomCode = "WXYZ";
                localhostLobby.emit({ type: "ROOM_CREATED", payload: { room: { roomCode: "WXYZ", playerCount: 2 } } });
                return { type: "ROOM_CREATED" };
            },
            async activateSession() {},
            async closeRoom() {},
            getHostSession() {
                return null;
            },
            destroy() {}
        };
        const localhostApp = createHostLanGameApp({
            root: localhostRoot,
            hostFactory: () => localhostHost,
            onReturnToHost: () => {}
        });
        await localhostApp.createRoom(2);
        assert(
            findFirst(localhostRoot, node => node.getAttribute?.("data-join-url")?.includes("localhost")) === null,
            "Case 11: Host opened on localhost does not render unusable QR join URL"
        );
        assert(
            findFirst(localhostRoot, node =>
                node.getAttribute?.("data-join-url")?.includes("192.168.50.24")
            ) !== null,
            "Case 12: Host opened on localhost uses the server-detected LAN address"
        );
        localhostApp.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Multiplayer Lobby UI threw", error.message);
    }

    console.log(`===== Multiplayer Lobby UI Test: ${passed} passed, ${failed} failed =====\n`);
}
