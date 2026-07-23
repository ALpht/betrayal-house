import { ActionType } from "../scenario/action/ActionType.js";
import { PlayerAction } from "../scenario/action/PlayerAction.js";
import { createLocalGameSession } from "../bootstrap/createLocalGameSession.js";
import { InMemoryTransport } from "../multiplayer/transport/InMemoryTransport.js";
import { TransportMessageType } from "../multiplayer/transport/TransportMessageType.js";
import { HostTransportGateway } from "../multiplayer/transport/HostTransportGateway.js";
import { GuestTransportClient } from "../multiplayer/transport/GuestTransportClient.js";
import { MultiplayerProjectionBuilder } from "../multiplayer/state/MultiplayerProjectionBuilder.js";
import { MultiplayerStatePublisher } from "../multiplayer/state/MultiplayerStatePublisher.js";
import { createHostGameSession } from "../multiplayer/session/createHostGameSession.js";
import { createGuestGameSession } from "../multiplayer/session/createGuestGameSession.js";

const SESSION_ID = "local-session";

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
                removeChild(child) {
                    this.children = this.children.filter(c => c !== child);
                    child.parentNode = null;
                },
                remove() {
                    this.parentNode?.removeChild?.(this);
                },
                replaceChildren(...children) {
                    this.children = [];
                    children.forEach(child => this.appendChild(child));
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

function createStartedRelicSession() {
    const session = createLocalGameSession({
        containers: createContainers(),
        characterIds: ["brandon", "ox"]
    }).start();
    session.startScenario("relicEscape");
    return session;
}

function createCollectAction(playerId, targetId = "relic_1") {
    return new PlayerAction({
        id: `action-${playerId}-${targetId}`,
        type: ActionType.COLLECT,
        playerId,
        payload: { itemId: "relic", targetId }
    });
}

function createMoveAction(playerId) {
    return new PlayerAction({
        id: `move-${playerId}`,
        type: ActionType.MOVE,
        playerId,
        payload: { destination: "exit" }
    });
}

function createProjectionBuilder(session) {
    return new MultiplayerProjectionBuilder({
        getRuntime: () => session.getRuntime(),
        getRouter: () => session.getRouter(),
        getTurnManager: () => session.getTurnManager(),
        getPlayerManager: () => session.getPlayerManager(),
        getVictoryResult: () => session.getLastVictoryResult(),
        isGameEnded: () => session.isGameEnded()
    });
}

function createGatewayHarness({ session = createStartedRelicSession() } = {}) {
    const { hostEndpoint, guestEndpoint } = InMemoryTransport.createPair();
    const sentStates = [];
    const builder = createProjectionBuilder(session);
    const publisher = new MultiplayerStatePublisher({
        sessionId: SESSION_ID,
        getProjection: viewerId => builder.build(viewerId),
        sendState: message => {
            sentStates.push(message);
            hostEndpoint.send(message);
        }
    });
    const gateway = new HostTransportGateway({
        transport: hostEndpoint,
        sessionId: SESSION_ID,
        executeAction: action => session.dispatchScenarioAction(action),
        publishState: viewerId => publisher.publish(viewerId)
    }).init();

    return {
        session,
        hostEndpoint,
        guestEndpoint,
        gateway,
        publisher,
        sentStates,
        destroy() {
            gateway.destroy();
            hostEndpoint.destroy();
            guestEndpoint.destroy();
            session.destroy();
        }
    };
}

function sendEnvelope(endpoint, {
    senderId,
    sequence = 1,
    action,
    sessionId = SESSION_ID
}) {
    return endpoint.send({
        type: TransportMessageType.PLAYER_ACTION,
        sessionId,
        senderId,
        sequence,
        payload: typeof action.toJSON === "function" ? action.toJSON() : action
    });
}

function snapshotState(session) {
    return JSON.stringify(session.getRuntime()?.toSnapshot?.().state || {});
}

export function runMultiplayerTransportTest() {
    console.log("\n===== Multiplayer Transport Test =====");
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

    try {
        const harness = createGatewayHarness();
        const playerId = harness.session.getCurrentPlayer().id;
        const before = harness.session.getDispatchCount();

        sendEnvelope(harness.guestEndpoint, {
            senderId: playerId,
            action: createCollectAction(playerId)
        });

        assert(
            harness.session.getDispatchCount() === before + 1,
            "Case 1: Guest PLAYER_ACTION reaches existing host action pipeline"
        );
        assert(
            harness.sentStates.length === 1 && harness.sentStates[0].revision === 1,
            "Case 2: Successful host action publishes STATE_UPDATED revision 1"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Cases 1-2 threw", e.message);
    }

    try {
        const { guestEndpoint } = InMemoryTransport.createPair();
        const guest = createGuestGameSession({
            transport: guestEndpoint,
            playerId: "player-guest"
        });

        assert(
            typeof guest.getRuntime === "undefined" &&
                typeof guest.dispatchScenarioAction === "undefined",
            "Case 3: Guest session exposes no runtime or gameplay dispatch"
        );
        guest.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 3 threw", e.message);
    }

    try {
        const harness = createGatewayHarness();
        const playerId = harness.session.getCurrentPlayer().id;
        const before = harness.session.getDispatchCount();
        let transportError = null;
        harness.guestEndpoint.subscribe(message => {
            if (message.type === TransportMessageType.TRANSPORT_ERROR) {
                transportError = message;
            }
        });

        harness.hostEndpoint.deliver({
            type: TransportMessageType.PLAYER_ACTION,
            sessionId: SESSION_ID,
            payload: {}
        });

        const malformedDidNotDispatch =
            harness.session.getDispatchCount() === before && transportError;

        const stateBefore = snapshotState(harness.session);
        sendEnvelope(harness.guestEndpoint, {
            senderId: playerId,
            sequence: 1,
            action: {
                id: "invalid-gameplay-action",
                type: "NOPE",
                playerId,
                payload: {}
            }
        });
        const stateAfter = snapshotState(harness.session);

        assert(
            malformedDidNotDispatch,
            "Case 4: Malformed envelope is rejected as transport error before dispatch"
        );
        assert(
            stateAfter === stateBefore && harness.publisher.getRevision() === 0,
            "Case 5: Invalid gameplay action leaves state unchanged without state publish"
        );
        assert(
            harness.gateway.getLastAcceptedSequence(playerId) === 1,
            "Case 5a: Gameplay rejection consumes sequence after transport delivery"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Cases 4-5 threw", e.message);
    }

    try {
        let latest = null;
        const { hostEndpoint, guestEndpoint } = InMemoryTransport.createPair();
        const client = new GuestTransportClient({
            transport: guestEndpoint,
            playerId: "player-guest",
            onStateUpdated: update => { latest = update; }
        }).connect();

        hostEndpoint.send({
            type: TransportMessageType.STATE_UPDATED,
            sessionId: SESSION_ID,
            revision: 2,
            payload: { projection: { marker: "new" } }
        });
        hostEndpoint.send({
            type: TransportMessageType.STATE_UPDATED,
            sessionId: SESSION_ID,
            revision: 1,
            payload: { projection: { marker: "old" } }
        });

        assert(
            latest.revision === 2 && latest.projection.marker === "new",
            "Case 6: Guest ignores stale STATE_UPDATED revision"
        );
        client.destroy();
        hostEndpoint.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 6 threw", e.message);
    }

    try {
        const originalRandom = Math.random;
        Math.random = () => 0.99;
        const session = createLocalGameSession({
            containers: createContainers(),
            characterIds: ["brandon", "ox"]
        }).start();
        session.startScenario("maskedHost");
        const heroId = session.getCurrentPlayer().id;
        session.endTurn();
        const traitorId = session.getCurrentPlayer().id;
        const builder = createProjectionBuilder(session);
        const heroProjection = builder.build(heroId);
        const traitorProjection = builder.build(traitorId);

        assert(
            !JSON.stringify(heroProjection).includes("Stay hidden") &&
                JSON.stringify(traitorProjection).includes("Stay hidden"),
            "Case 7: Viewer-safe projection filters private traitor information on host"
        );
        assert(
            !Object.hasOwn(heroProjection, "router") &&
                !Object.hasOwn(heroProjection, "snapshot") &&
                heroProjection.victory.completed === false,
            "Case 7a: Projection exposes UI data with stable null-state fields only"
        );

        session.destroy();
        Math.random = originalRandom;
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 7 threw", e.message);
    }

    try {
        const harness = createGatewayHarness();
        const playerId = harness.session.getCurrentPlayer().id;
        for (const target of ["relic_1", "relic_2", "relic_3"]) {
            harness.session.dispatchScenarioAction(createCollectAction(playerId, target));
        }
        harness.session.dispatchScenarioAction(createMoveAction(playerId));
        const stateBefore = snapshotState(harness.session);
        const dispatchBefore = harness.session.getDispatchCount();

        sendEnvelope(harness.guestEndpoint, {
            senderId: playerId,
            sequence: 1,
            action: createCollectAction(playerId, "late_relic")
        });

        assert(
            harness.session.getLastVictoryResult()?.winner === "heroes" &&
                snapshotState(harness.session) === stateBefore &&
                harness.session.getDispatchCount() === dispatchBefore,
            "Case 8: Victory lock prevents post-victory guest state mutation"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 8 threw", e.message);
    }

    try {
        const harness = createGatewayHarness();
        const playerId = harness.session.getCurrentPlayer().id;
        const before = harness.session.getDispatchCount();
        harness.destroy();

        sendEnvelope(harness.guestEndpoint, {
            senderId: playerId,
            action: createCollectAction(playerId)
        });

        assert(
            harness.session.getDispatchCount() === before,
            "Case 9: Destroy removes stale transport callbacks"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 9 threw", e.message);
    }

    try {
        const session = createStartedRelicSession();
        const moved = session.move("east");
        assert(
            moved === true,
            "Case 10: Host local play regression remains able to move/explore"
        );
        session.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 10 threw", e.message);
    }

    try {
        const harness = createGatewayHarness();
        const playerId = harness.session.getCurrentPlayer().id;
        const before = harness.session.getDispatchCount();

        sendEnvelope(harness.guestEndpoint, {
            senderId: "other-player",
            sequence: 1,
            action: createCollectAction(playerId)
        });

        assert(
            harness.session.getDispatchCount() === before &&
                harness.gateway.getLastAcceptedSequence("other-player") === 0,
            "Case 11: senderId/playerId mismatch rejects before dispatch and sequence consumption"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 11 threw", e.message);
    }

    try {
        const harness = createGatewayHarness();
        const playerId = harness.session.getCurrentPlayer().id;
        const actionPayload = createCollectAction(playerId, "relic_1").toJSON();
        const envelope = {
            type: TransportMessageType.PLAYER_ACTION,
            sessionId: SESSION_ID,
            senderId: playerId,
            sequence: 1,
            payload: actionPayload
        };

        harness.guestEndpoint.send(envelope);
        envelope.payload.payload.targetId = "relic_2";

        assert(
            harness.session.getRuntime().toSnapshot().state.collectedRelicIds.includes("relic_1") &&
                !harness.session.getRuntime().toSnapshot().state.collectedRelicIds.includes("relic_2"),
            "Case 12: InMemoryTransport serialize/deserialize prevents shared object mutation"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 12 threw", e.message);
    }

    try {
        const harness = createGatewayHarness();
        const playerId = harness.session.getCurrentPlayer().id;
        const envelope = {
            type: TransportMessageType.PLAYER_ACTION,
            sessionId: SESSION_ID,
            senderId: playerId,
            sequence: 1,
            payload: createCollectAction(playerId, "relic_1").toJSON()
        };

        harness.guestEndpoint.send(envelope);
        harness.guestEndpoint.send(envelope);

        assert(
            harness.session.getDispatchCount() === 1,
            "Case 13: Duplicate sequence does not duplicate dispatch"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 13 threw", e.message);
    }

    try {
        const { hostEndpoint, guestEndpoint } = InMemoryTransport.createPair();
        const host = createHostGameSession({
            transport: hostEndpoint,
            localSessionOptions: {
                containers: createContainers(),
                characterIds: ["brandon", "ox"]
            }
        }).start();
        host.localSession.startScenario("relicEscape");
        const playerId = host.localSession.getCurrentPlayer().id;
        const guest = createGuestGameSession({
            transport: guestEndpoint,
            playerId
        }).connect();

        guest.sendAction(createCollectAction(playerId, "relic_1"));

        assert(
            host.localSession.getDispatchCount() === 1 &&
                guest.getState().revision === 1 &&
                guest.getState().projection.viewerId === playerId,
            "Case 14: Minimal host/guest flow executes action and receives projection"
        );

        guest.destroy();
        host.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 14 threw", e.message);
    }

    console.log(`===== Multiplayer Transport Test: ${passed} passed, ${failed} failed =====\n`);
}
