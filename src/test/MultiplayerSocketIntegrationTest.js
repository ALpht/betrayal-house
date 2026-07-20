import { MultiplayerSocketServer } from "../../server/MultiplayerSocketServer.js";
import { ActionType } from "../scenario/action/ActionType.js";
import { PlayerAction } from "../scenario/action/PlayerAction.js";
import { createMultiplayerHostBrowser } from "../bootstrap/createMultiplayerHostBrowser.js";
import { createMultiplayerGuestBrowser } from "../bootstrap/createMultiplayerGuestBrowser.js";

function createContainers() {
    return {
        turn: document.createElement("pre"),
        character: document.createElement("pre"),
        action: document.createElement("div"),
        scenario: document.createElement("pre"),
        card: document.createElement("pre"),
        victory: document.createElement("pre"),
        status: document.createElement("pre")
    };
}

function waitUntil(condition, timeoutMs = 500) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        function tick() {
            if (condition()) {
                resolve();
                return;
            }
            if (Date.now() - start >= timeoutMs) {
                reject(new Error("Timed out waiting for condition"));
                return;
            }
            setTimeout(tick, 10);
        }
        tick();
    });
}

function createCollectAction(playerId, targetId = "relic_1") {
    return new PlayerAction({
        id: `socket-collect-${playerId}-${targetId}`,
        type: ActionType.COLLECT,
        playerId,
        payload: { itemId: "relic", targetId }
    });
}

function createEndTurnAction(playerId) {
    return new PlayerAction({
        id: `socket-end-turn-${playerId}-${Math.random()}`,
        type: ActionType.END_TURN,
        playerId,
        payload: {}
    });
}

export async function runMultiplayerSocketIntegrationTest() {
    console.log("\n===== Multiplayer Socket Integration Test =====");
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

    if (typeof document === "undefined") {
        global.document = {
            createElement(tag) {
                return {
                    tagName: tag.toUpperCase(),
                    textContent: "",
                    disabled: false,
                    children: [],
                    parentNode: null,
                    appendChild(child) {
                        child.parentNode = this;
                        this.children.push(child);
                        return child;
                    },
                    replaceChildren(...children) {
                        this.children = [];
                        children.forEach(child => this.appendChild(child));
                    },
                    removeChild(child) {
                        this.children = this.children.filter(item => item !== child);
                        child.parentNode = null;
                    },
                    remove() {
                        this.parentNode?.removeChild(this);
                    },
                    setAttribute(name, value) {
                        this[name] = value;
                    },
                    addEventListener() {},
                    removeEventListener() {}
                };
            }
        };
    }

    let server;
    let hostBrowser;
    let guestBrowser;

    try {
        server = await new MultiplayerSocketServer({ port: 0 }).start();
        const url = `http://localhost:${server.getPort()}`;
        hostBrowser = createMultiplayerHostBrowser({
            url,
            localSessionOptions: {
                containers: createContainers(),
                characterIds: ["brandon", "ox"]
            }
        });
        guestBrowser = createMultiplayerGuestBrowser({ url });

        await waitUntil(() => hostBrowser.lobby.getState().clientId);
        await waitUntil(() => guestBrowser.lobby.getState().clientId);
        const created = await hostBrowser.createRoom();
        await guestBrowser.joinRoom(created.payload.room.roomCode);
        await waitUntil(() => hostBrowser.lobby.getState().peerConnected);
        const { hostSession } = await hostBrowser.activateSession();
        await waitUntil(() => guestBrowser.getGuestSession()?.getState().revision === 1);

        const guestSession = guestBrowser.getGuestSession();
        const guestState = guestSession.getState();
        const guestBinding = hostSession.getGuestBinding();
        const hostBinding = hostSession.getPlayerBindings()
            .find(binding => binding.role === "HOST");

        assert(
            guestState.revision === 1 &&
                guestState.playerId === guestBinding.playerId &&
                guestState.projection.viewerId === guestBinding.viewerId,
            "Case 1: Create/join/bind delivers initial viewer-safe projection at revision 1"
        );

        hostSession.localSession.startScenario("relicEscape");
        hostSession.publishGuestState();
        await waitUntil(() => guestSession.getState().revision === 2);
        hostSession.executeAndPublish({
            action: createEndTurnAction(hostBinding.playerId)
        });
        await waitUntil(() => guestSession.getState().projection.turn.isViewerTurn === true);
        const beforeDispatch = hostSession.localSession.getDispatchCount();
        guestSession.sendAction(createCollectAction(guestBinding.playerId, "relic_1"));
        await waitUntil(() => guestSession.getState().lastActionResult?.sequence === 1);

        assert(
            hostSession.localSession.getDispatchCount() === beforeDispatch + 1 &&
                guestSession.getState().lastActionResult.accepted === true &&
                guestSession.getState().revision === 4,
            "Case 2: Guest action crosses socket once and receives ACTION_RESULT plus STATE_UPDATED"
        );

        guestBrowser.destroy();
        await waitUntil(() => hostBrowser.lobby.getState().connectionState === "RECONNECTING");
        const dispatchAfterDisconnect = hostSession.localSession.getDispatchCount();
        hostSession.executeAndPublish({
            action: createCollectAction(hostBinding.playerId, "relic_2")
        });

        assert(
            hostSession.localSession.getDispatchCount() === dispatchAfterDisconnect + 1 &&
                hostBrowser.lobby.getState().connectionState === "RECONNECTING",
            "Case 3: Active guest disconnect enters RECONNECTING and host gameplay does not rollback"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Socket integration cases threw", e.message);
    } finally {
        guestBrowser?.destroy();
        hostBrowser?.destroy();
        await server?.stop();
    }

    console.log(`===== Multiplayer Socket Integration Test: ${passed} passed, ${failed} failed =====\n`);
}
