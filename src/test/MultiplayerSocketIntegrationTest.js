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
    let guestBrowserB;

    try {
        server = await new MultiplayerSocketServer({
            port: 0,
            lanAddressResolver: () => "192.168.50.24"
        }).start();
        const url = `http://localhost:${server.getPort()}`;
        hostBrowser = createMultiplayerHostBrowser({
            url,
            localSessionOptions: {
                containers: createContainers(),
                characterIds: ["brandon", "ox"]
            }
        });
        guestBrowser = createMultiplayerGuestBrowser({ url });
        guestBrowserB = createMultiplayerGuestBrowser({ url });

        await waitUntil(() => hostBrowser.lobby.getState().clientId);
        await waitUntil(() => guestBrowser.lobby.getState().clientId);
        await waitUntil(() => guestBrowserB.lobby.getState().clientId);
        assert(
            hostBrowser.lobby.getState().lanAddress === "192.168.50.24",
            "Case 0: Socket handshake publishes the detected Host LAN address"
        );
        const created = await hostBrowser.createRoom({ playerCount: 2 });
        await guestBrowser.joinRoom({
            roomCode: created.payload.room.roomCode,
            displayName: "A"
        });
        await guestBrowserB.joinRoom({
            roomCode: created.payload.room.roomCode,
            displayName: "B"
        });
        await guestBrowser.setReady(true);
        await guestBrowserB.setReady(true);
        await waitUntil(() => hostBrowser.lobby.getState().canStart);
        const { hostSession } = await hostBrowser.activateSession();
        await waitUntil(() => guestBrowser.getGuestSession()?.getState().revision >= 1);
        await waitUntil(() => guestBrowserB.getGuestSession()?.getState().revision >= 1);

        const guestSession = guestBrowser.getGuestSession();
        const guestSessionB = guestBrowserB.getGuestSession();
        const guestState = guestSession.getState();
        const guestBinding = hostSession.getPlayerBinding(guestState.playerId) ||
            hostSession.getPlayerBindings().find(binding => binding.playerId === guestState.playerId);
        const guestBindingB = hostSession.getPlayerBindings()
            .find(binding => binding.playerId === guestSessionB.getState().playerId);
        const publicAssignments = hostBrowser.lobby.getState().roster;

        assert(
            guestState.revision >= 1 &&
                guestState.playerId === guestBinding.playerId &&
                guestState.projection.viewerId === guestBinding.viewerId &&
                guestSessionB.getState().playerId === guestBindingB.playerId &&
                publicAssignments.every(member => member.playerId && member.publicCharacterName),
            "Case 1: Create/join/bind delivers unique viewer-safe projections"
        );

        hostSession.localSession.startScenario("relicEscape");
        hostSession.publishAllGuestStates();
        await waitUntil(() => guestSession.getState().projection.scenario?.title);
        const beforeDispatch = hostSession.localSession.getDispatchCount();
        guestSession.sendAction(createCollectAction(guestBinding.playerId, "relic_1"));
        await waitUntil(() => guestSession.getState().lastActionResult?.sequence === 1);

        assert(
            hostSession.localSession.getDispatchCount() === beforeDispatch + 1 &&
                guestSession.getState().lastActionResult.accepted === true,
            "Case 2: Guest action crosses socket once and receives ACTION_RESULT plus STATE_UPDATED"
        );

        guestSession.sendAction(createEndTurnAction(guestBinding.playerId));
        await waitUntil(() =>
            guestSession.getState().lastActionResult?.sequence === 2
        );
        guestBrowser.destroy();
        await waitUntil(() => hostBrowser.lobby.getState().roster.some(member =>
            member.connectionState === "RECONNECTING"
        ));
        const dispatchAfterDisconnect = hostSession.localSession.getDispatchCount();
        guestSessionB.sendAction(createCollectAction(guestBindingB.playerId, "relic_2"));
        await waitUntil(() => guestSessionB.getState().lastActionResult?.sequence === 1);

        assert(
            hostSession.localSession.getDispatchCount() === dispatchAfterDisconnect + 1 &&
                hostBrowser.lobby.getState().connectionState === "ACTIVE",
            "Case 3: One Guest reconnecting does not reset other Guests"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Socket integration cases threw", e.message);
    } finally {
        guestBrowser?.destroy();
        guestBrowserB?.destroy();
        hostBrowser?.destroy();
        await server?.stop();
    }

    console.log(`===== Multiplayer Socket Integration Test: ${passed} passed, ${failed} failed =====\n`);
}
