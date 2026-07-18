import { MultiplayerSocketServer } from "../../server/MultiplayerSocketServer.js";
import { ActionType } from "../scenario/action/ActionType.js";
import { PlayerAction } from "../scenario/action/PlayerAction.js";
import { createMultiplayerHostBrowser } from "../bootstrap/createMultiplayerHostBrowser.js";
import { createMultiplayerGuestBrowser } from "../bootstrap/createMultiplayerGuestBrowser.js";

function installDocumentMock() {
    if (typeof document !== "undefined") return;
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

function waitUntil(condition, timeoutMs = 1000) {
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

function createAction({ type, playerId, payload = {}, id }) {
    return new PlayerAction({ id, type, playerId, payload });
}

export async function runMultiplayerResumeIntegrationTest() {
    console.log("\n===== Multiplayer Resume Integration Test =====");
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

    installDocumentMock();
    let server;
    let hostBrowser;
    let guestBrowser;

    try {
        server = await new MultiplayerSocketServer({ port: 0, reconnectGraceMs: 2000 }).start();
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
        const guestBinding = hostSession.getGuestBinding();
        const hostBinding = hostSession.getPlayerBindings()
            .find(binding => binding.role === "HOST");
        const oldClientId = guestBrowser.lobby.getState().clientId;
        const oldToken = guestBrowser.lobby.getState().resumeToken;

        hostSession.localSession.startScenario("relicEscape");
        hostSession.publishGuestState();
        await waitUntil(() => guestSession.getState().revision === 2);
        hostSession.executeAndPublish({
            action: createAction({
                type: ActionType.END_TURN,
                playerId: hostBinding.playerId,
                id: "resume-end-turn-host"
            })
        });
        await waitUntil(() => guestSession.getState().revision === 3);
        guestSession.sendAction(createAction({
            type: ActionType.COLLECT,
            playerId: guestBinding.playerId,
            payload: { itemId: "relic", targetId: "relic_1" },
            id: "resume-guest-seq-1"
        }));
        await waitUntil(() => guestSession.getState().lastActionResult?.sequence === 1);
        const previousRevision = guestSession.getState().revision;
        const previousSequence = guestSession.getSequence();

        guestBrowser.disconnectForReconnect();
        await waitUntil(() => hostBrowser.lobby.getState().connectionState === "RECONNECTING");

        hostSession.executeAndPublish({
            action: createAction({
                type: ActionType.COLLECT,
                playerId: hostBinding.playerId,
                payload: { itemId: "relic", targetId: "relic_2" },
                id: "resume-host-offline-action"
            })
        });
        const resumeResult = await guestBrowser.resumeRoom();
        await waitUntil(() => guestBrowser.getGuestSession()?.getState().revision >= previousRevision);

        const resumedState = guestBrowser.getGuestSession().getState();
        const newToken = guestBrowser.lobby.getState().resumeToken;
        const resumedClientId = guestBrowser.lobby.getState().clientId;
        const duplicateOld = await guestBrowser.lobby.resumeRoom({
            roomCode: created.payload.room.roomCode,
            resumeToken: oldToken
        });

        assert(
            resumeResult.type === "ROOM_RESUMED" &&
                resumedClientId === oldClientId &&
                newToken &&
                newToken !== oldToken,
            "Case 1: Guest resumes same stable clientId and receives rotated token"
        );
        assert(
            resumedState.revision >= previousRevision &&
                resumedState.projection.viewerId === guestBinding.viewerId,
            "Case 2: Guest accepts latest recovery baseline projection"
        );
        assert(
            duplicateOld.type === "RESUME_REJECTED",
            "Case 3: Old token cannot be reused after successful resume"
        );

        guestBrowser.getGuestSession().sendAction(createAction({
            type: ActionType.COLLECT,
            playerId: guestBinding.playerId,
            payload: { itemId: "relic", targetId: "relic_3" },
            id: "resume-guest-seq-2"
        }));
        await waitUntil(() => guestBrowser.getGuestSession().getState().lastActionResult?.sequence === previousSequence + 1);

        assert(
            guestBrowser.getGuestSession().getSequence() === previousSequence + 1 &&
                hostSession.localSession.getDispatchCount() >= 3,
            "Case 4: Guest sequence continues after reconnect and gameplay dispatches once"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Resume integration cases threw", e.message);
    } finally {
        guestBrowser?.destroy();
        hostBrowser?.destroy();
        await server?.stop();
    }

    console.log(`===== Multiplayer Resume Integration Test: ${passed} passed, ${failed} failed =====\n`);
}
