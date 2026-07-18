import { ActionType } from "../scenario/action/ActionType.js";
import { PlayerAction } from "../scenario/action/PlayerAction.js";
import { createLocalGameSession } from "../bootstrap/createLocalGameSession.js";
import { InMemoryTransport } from "../multiplayer/transport/InMemoryTransport.js";
import { TransportMessageType } from "../multiplayer/transport/TransportMessageType.js";
import { HostTransportGateway } from "../multiplayer/transport/HostTransportGateway.js";
import { GuestTransportClient } from "../multiplayer/transport/GuestTransportClient.js";
import {
    MultiplayerActionCoordinator,
    ActionResultReasonCode
} from "../multiplayer/session/MultiplayerActionCoordinator.js";
import {
    MultiplayerPlayerBinding,
    MultiplayerPlayerRole
} from "../multiplayer/session/MultiplayerPlayerBinding.js";
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

function createAction({ type, playerId, payload = {}, id = null }) {
    return new PlayerAction({
        id: id || `${type}-${playerId}-${JSON.stringify(payload)}`,
        type,
        playerId,
        payload
    });
}

function createCollectAction(playerId, targetId = "relic_1") {
    return createAction({
        type: ActionType.COLLECT,
        playerId,
        payload: { itemId: "relic", targetId },
        id: `collect-${playerId}-${targetId}`
    });
}

function createEndTurnAction(playerId) {
    return createAction({
        type: ActionType.END_TURN,
        playerId,
        payload: {},
        id: `end-turn-${playerId}-${Math.random()}`
    });
}

function createMoveExitAction(playerId) {
    return createAction({
        type: ActionType.MOVE,
        playerId,
        payload: { destination: "exit" },
        id: `move-exit-${playerId}`
    });
}

function createHostGuestHarness() {
    const { hostEndpoint, guestEndpoint } = InMemoryTransport.createPair();
    const observedGuestMessages = [];
    guestEndpoint.subscribe(message => observedGuestMessages.push(message.type));
    const host = createHostGameSession({
        transport: hostEndpoint,
        localSessionOptions: {
            containers: createContainers(),
            characterIds: ["brandon", "ox"]
        }
    }).start();
    host.localSession.startScenario("relicEscape");

    const players = host.localSession.getPlayerManager().getAllPlayers();
    const hostPlayerId = players[0].id;
    const guestPlayerId = players[1].id;
    const guest = createGuestGameSession({
        transport: guestEndpoint,
        playerId: guestPlayerId
    }).connect();

    return {
        host,
        guest,
        hostEndpoint,
        guestEndpoint,
        observedGuestMessages,
        hostPlayerId,
        guestPlayerId,
        destroy() {
            guest.destroy();
            host.destroy();
        }
    };
}

function sendRawPlayerAction(endpoint, {
    senderId,
    sequence = 1,
    action
}) {
    endpoint.send({
        type: TransportMessageType.PLAYER_ACTION,
        sessionId: SESSION_ID,
        senderId,
        sequence,
        payload: typeof action.toJSON === "function" ? action.toJSON() : action
    });
}

function createCoordinatorHarness({
    accepted = true,
    gameEnded = false
} = {}) {
    const binding = new MultiplayerPlayerBinding({
        sessionId: SESSION_ID,
        clientId: "guest-client",
        playerId: "guest-client",
        viewerId: "guest-client",
        role: MultiplayerPlayerRole.GUEST
    });
    let calls = 0;
    const coordinator = new MultiplayerActionCoordinator({
        getPlayerBinding: clientId => clientId === binding.clientId ? binding : null,
        executeAuthoritativeAction: () => {
            calls++;
            return accepted
                ? { accepted: true, reasonCode: null }
                : { accepted: false, reasonCode: "ACTION_REJECTED" };
        },
        isGameEnded: () => gameEnded
    });

    return {
        coordinator,
        binding,
        getCalls: () => calls
    };
}

export function runMultiplayerActionTurnSyncTest() {
    console.log("\n===== Multiplayer Action / Turn Sync Test =====");
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
        const binding = new MultiplayerPlayerBinding({
            sessionId: SESSION_ID,
            clientId: "guest-client",
            playerId: "guest-client",
            viewerId: "guest-client",
            role: MultiplayerPlayerRole.GUEST
        });

        assert(
            binding.playerId === binding.viewerId &&
                Object.isFrozen(binding),
            "Case 1: Player binding assigns one immutable playerId/viewerId"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 1 threw", e.message);
    }

    try {
        const { coordinator, binding, getCalls } = createCoordinatorHarness();
        const result = coordinator.handleGuestAction({
            senderId: binding.clientId,
            sequence: 1,
            actionPayload: createCollectAction(binding.playerId).toJSON()
        });

        assert(
            result.accepted === true &&
                result.reasonCode === null &&
                result.shouldPublish === true &&
                getCalls() === 1,
            "Case 2: Valid guest action reaches authoritative executor and publishes"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 2 threw", e.message);
    }

    try {
        const { coordinator, binding, getCalls } = createCoordinatorHarness({
            accepted: false
        });
        const result = coordinator.handleGuestAction({
            senderId: binding.clientId,
            sequence: 3,
            actionPayload: createCollectAction(binding.playerId).toJSON()
        });
        const retry = coordinator.handleGuestAction({
            senderId: binding.clientId,
            sequence: 3,
            actionPayload: createCollectAction(binding.playerId).toJSON()
        });

        assert(
            result.accepted === false &&
                result.reasonCode === ActionResultReasonCode.ACTION_REJECTED &&
                retry.reasonCode === ActionResultReasonCode.DUPLICATE_SEQUENCE &&
                getCalls() === 1,
            "Case 3: Gameplay rejection consumes sequence without state publish"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 3 threw", e.message);
    }

    try {
        const { coordinator, binding, getCalls } = createCoordinatorHarness();
        const forged = createCollectAction("other-player").toJSON();
        const result = coordinator.handleGuestAction({
            senderId: binding.clientId,
            sequence: 1,
            actionPayload: forged
        });

        assert(
            result.reasonCode === ActionResultReasonCode.IDENTITY_MISMATCH &&
                getCalls() === 0 &&
                coordinator.getLastConsumedSequence(binding.clientId) === 0,
            "Case 4: Forged playerId rejects before gameplay and sequence tracking"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 4 threw", e.message);
    }

    try {
        const { coordinator, binding, getCalls } = createCoordinatorHarness();
        const result = coordinator.handleGuestAction({
            senderId: "unknown",
            sequence: 1,
            actionPayload: createCollectAction(binding.playerId).toJSON()
        });

        assert(
            result.reasonCode === ActionResultReasonCode.IDENTITY_MISMATCH &&
                getCalls() === 0 &&
                coordinator.getLastConsumedSequence("unknown") === 0,
            "Case 5: Unknown sender creates no binding, sequence, dispatch, or revision"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 5 threw", e.message);
    }

    try {
        const harness = createHostGuestHarness();
        harness.host.executeAndPublish({
            action: createEndTurnAction(harness.hostPlayerId),
            viewerId: harness.guestPlayerId
        });
        const guestProjection = harness.guest.getState().projection;
        const hostProjection = harness.host.getProjection(harness.hostPlayerId);

        assert(
            harness.host.localSession.getCurrentPlayer().id === harness.guestPlayerId &&
                guestProjection.turn.isViewerTurn === true &&
                hostProjection.turn.isViewerTurn === false,
            "Case 6: END_TURN updates authoritative turn and both projections"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 6 threw", e.message);
    }

    try {
        const harness = createHostGuestHarness();
        const hostProjection = harness.host.getProjection(harness.hostPlayerId);
        const guestProjectionBefore = harness.host.getProjection(harness.guestPlayerId);
        harness.host.executeAndPublish({
            action: createEndTurnAction(harness.hostPlayerId),
            viewerId: harness.guestPlayerId
        });
        const guestProjectionAfter = harness.guest.getState().projection;

        const hostHasEnabled = hostProjection.actions.some(action => action.enabled);
        const guestBeforeDisabled = guestProjectionBefore.actions.every(action => !action.enabled);
        const guestAfterEnabled = guestProjectionAfter.actions.some(action => action.enabled);

        assert(
            hostHasEnabled && guestBeforeDisabled && guestAfterEnabled,
            "Case 7: Viewer action availability follows current viewer turn"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 7 threw", e.message);
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
        const { hostEndpoint } = InMemoryTransport.createPair();
        const host = createHostGameSession({
            transport: hostEndpoint,
            localSessionOptions: {
                containers: createContainers(),
                characterIds: ["brandon", "ox"]
            }
        });
        host.localSession.destroy();
        const builderHost = {
            getProjection: viewerId => {
                const projectionBuilder = host.getProjection;
                return projectionBuilder.call(host, viewerId);
            }
        };
        const heroText = JSON.stringify(session.getRouter().getVisiblePackets(
            heroId,
            traitorId
        ));
        const traitorText = JSON.stringify(session.getRouter().getVisiblePackets(
            traitorId,
            traitorId
        ));

        assert(
            !heroText.includes("Stay hidden") &&
                traitorText.includes("Stay hidden") &&
                typeof builderHost.getProjection === "function",
            "Case 8: Private visibility remains host-filtered per viewer"
        );
        session.destroy();
        host.destroy();
        Math.random = originalRandom;
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 8 threw", e.message);
    }

    try {
        const { hostEndpoint, guestEndpoint } = InMemoryTransport.createPair();
        const resultLog = [];
        const client = new GuestTransportClient({
            transport: guestEndpoint,
            playerId: "player-1",
            onActionResult: result => resultLog.push(result)
        }).connect();
        client.sendAction(createCollectAction("player-1"));
        hostEndpoint.send({
            type: TransportMessageType.ACTION_RESULT,
            sessionId: SESSION_ID,
            payload: {
                sequence: 2,
                accepted: false,
                reasonCode: "DUPLICATE_SEQUENCE"
            }
        });
        const stillPending = client.getPendingAction()?.sequence === 1;
        hostEndpoint.send({
            type: TransportMessageType.ACTION_RESULT,
            sessionId: SESSION_ID,
            payload: {
                sequence: 1,
                accepted: true,
                reasonCode: null
            }
        });

        assert(
            stillPending &&
                client.getPendingAction() === null &&
                resultLog.length === 2,
            "Case 9: ACTION_RESULT clears only matching pending sequence"
        );
        client.destroy();
        hostEndpoint.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 9 threw", e.message);
    }

    try {
        const { guestEndpoint } = InMemoryTransport.createPair();
        const client = new GuestTransportClient({
            transport: guestEndpoint,
            playerId: "player-1"
        }).connect();
        const first = client.sendAction(createCollectAction("player-1", "relic_1"));
        const second = client.sendAction(createCollectAction("player-1", "relic_2"));

        assert(
            first === true && second === false && client.getSequence() === 1,
            "Case 10: Guest cannot send a second action while pending"
        );
        client.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 10 threw", e.message);
    }

    try {
        const { coordinator, binding, getCalls } = createCoordinatorHarness({
            accepted: false
        });
        coordinator.handleGuestAction({
            senderId: binding.clientId,
            sequence: 11,
            actionPayload: createCollectAction(binding.playerId).toJSON()
        });
        coordinator.handleGuestAction({
            senderId: binding.clientId,
            sequence: 11,
            actionPayload: createCollectAction(binding.playerId).toJSON()
        });

        assert(
            getCalls() === 1 &&
                coordinator.getLastConsumedSequence(binding.clientId) === 11,
            "Case 11: Rejected action consumes sequence and retry does not re-enter gameplay"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 11 threw", e.message);
    }

    try {
        const harness = createHostGuestHarness();
        harness.host.executeAndPublish({
            action: createEndTurnAction(harness.hostPlayerId),
            viewerId: harness.guestPlayerId
        });
        harness.observedGuestMessages.length = 0;
        harness.guest.sendAction(createCollectAction(harness.guestPlayerId));

        assert(
            harness.observedGuestMessages[0] === TransportMessageType.ACTION_RESULT &&
                harness.observedGuestMessages[1] === TransportMessageType.STATE_UPDATED &&
                harness.guest.getState().lastActionResult.accepted === true &&
                harness.guest.getState().revision > 0,
            "Case 12: Valid action sends ACTION_RESULT before STATE_UPDATED"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 12 threw", e.message);
    }

    try {
        const harness = createHostGuestHarness();
        for (const target of ["relic_1", "relic_2", "relic_3"]) {
            harness.host.localSession.dispatchScenarioAction(
                createCollectAction(harness.hostPlayerId, target)
            );
        }
        harness.host.executeAndPublish({
            action: createMoveExitAction(harness.hostPlayerId),
            viewerId: harness.guestPlayerId
        });
        const projection = harness.guest.getState().projection;

        assert(
            projection.gameEnded === true &&
                projection.victory.completed === true &&
                projection.actions.length === 0,
            "Case 13: Victory action publishes gameEnded projection and disables actions"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 13 threw", e.message);
    }

    try {
        const { coordinator, binding, getCalls } = createCoordinatorHarness({
            gameEnded: true
        });
        const result = coordinator.handleGuestAction({
            senderId: binding.clientId,
            sequence: 8,
            actionPayload: createCollectAction(binding.playerId).toJSON()
        });

        assert(
            result.reasonCode === ActionResultReasonCode.GAME_ENDED &&
                getCalls() === 0 &&
                coordinator.getLastConsumedSequence(binding.clientId) === 8,
            "Case 14: Post-victory action consumes sequence without dispatch or publish"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 14 threw", e.message);
    }

    try {
        const { hostEndpoint, guestEndpoint } = InMemoryTransport.createPair();
        let callbacks = 0;
        const guest = createGuestGameSession({
            transport: guestEndpoint,
            playerId: "player-1"
        }).connect();
        guest.subscribe(() => { callbacks++; });
        guest.sendAction(createCollectAction("player-1"));
        guest.destroy();
        hostEndpoint.send({
            type: TransportMessageType.ACTION_RESULT,
            sessionId: SESSION_ID,
            payload: {
                sequence: 1,
                accepted: true,
                reasonCode: null
            }
        });
        hostEndpoint.send({
            type: TransportMessageType.STATE_UPDATED,
            sessionId: SESSION_ID,
            revision: 1,
            payload: { projection: { late: true } }
        });

        assert(
            guest.getState().pendingAction === null && callbacks <= 1,
            "Case 15: Destroy clears pending and ignores late result/state callbacks"
        );
        hostEndpoint.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 15 threw", e.message);
    }

    try {
        const session = createLocalGameSession({
            containers: createContainers(),
            characterIds: ["brandon", "ox"]
        }).start();
        session.startScenario("relicEscape");
        const moved = session.move("east");

        assert(
            moved === true,
            "Case 16: Host local input still follows M15 exploration flow"
        );
        session.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 16 threw", e.message);
    }

    try {
        const { coordinator, binding } = createCoordinatorHarness();
        coordinator.handleGuestAction({
            senderId: binding.clientId,
            sequence: 1,
            actionPayload: createCollectAction(binding.playerId).toJSON()
        });

        assert(
            coordinator.getLastConsumedSequence(binding.clientId) === 1,
            "Case 17: M16A sequence regression remains available"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 17 threw", e.message);
    }

    try {
        const harness = createHostGuestHarness();
        const hostEnd = harness.host.executeAndPublish({
            action: createEndTurnAction(harness.hostPlayerId),
            viewerId: harness.guestPlayerId
        });
        const guestTurn = harness.guest.getState().projection.turn.isViewerTurn;
        const guestAction = harness.guest.sendAction(
            createCollectAction(harness.guestPlayerId, "relic_1")
        );
        const guestEnd = harness.guest.sendAction(
            createEndTurnAction(harness.guestPlayerId)
        );
        const hostTurn = harness.host.getProjection(harness.hostPlayerId).turn.isViewerTurn;

        assert(
            hostEnd.accepted === true &&
                guestTurn === true &&
                guestAction === true &&
                guestEnd === true &&
                hostTurn === true,
            "Case 18: Minimal alternating turn flow synchronizes host and guest"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 18 threw", e.message);
    }

    try {
        let acceptedInvalid = false;
        let rejectedInvalid = false;
        try {
            new MultiplayerPlayerBinding({
                sessionId: SESSION_ID,
                clientId: "c",
                playerId: "p",
                viewerId: "v",
                role: MultiplayerPlayerRole.GUEST
            });
        } catch (_error) {
            acceptedInvalid = true;
        }
        try {
            const { hostEndpoint } = InMemoryTransport.createPair();
            hostEndpoint.send({
                type: TransportMessageType.ACTION_RESULT,
                sessionId: SESSION_ID,
                payload: {
                    sequence: 1,
                    accepted: false,
                    reasonCode: null
                }
            });
        } catch (_error) {
            rejectedInvalid = true;
        }

        assert(
            acceptedInvalid && rejectedInvalid,
            "Case 19: Binding and ACTION_RESULT contracts reject inconsistent data"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 19 threw", e.message);
    }

    try {
        const { coordinator, binding, getCalls } = createCoordinatorHarness({
            gameEnded: true
        });
        coordinator.handleGuestAction({
            senderId: binding.clientId,
            sequence: 8,
            actionPayload: createCollectAction(binding.playerId).toJSON()
        });
        const duplicate = coordinator.handleGuestAction({
            senderId: binding.clientId,
            sequence: 8,
            actionPayload: createCollectAction(binding.playerId).toJSON()
        });
        const next = coordinator.handleGuestAction({
            senderId: binding.clientId,
            sequence: 9,
            actionPayload: createCollectAction(binding.playerId).toJSON()
        });

        assert(
            duplicate.reasonCode === ActionResultReasonCode.DUPLICATE_SEQUENCE &&
                next.reasonCode === ActionResultReasonCode.GAME_ENDED &&
                getCalls() === 0,
            "Case 20: Post-victory sequence rejects duplicate and allows next new sequence"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 20 threw", e.message);
    }

    try {
        const harness = createHostGuestHarness();
        const beforeDispatch = harness.host.localSession.getDispatchCount();
        const beforeRevision = harness.guest.getState().revision;
        harness.host.executeAndPublish({
            action: createCollectAction(harness.hostPlayerId, "relic_1"),
            viewerId: harness.guestPlayerId
        });

        assert(
            harness.host.localSession.getDispatchCount() === beforeDispatch + 1 &&
                harness.guest.getState().revision === beforeRevision + 1,
            "Case 21: Host local accepted action executes once and publishes guest projection"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 21 threw", e.message);
    }

    try {
        const harness = createHostGuestHarness();
        const nonCurrentProjection = harness.host.getProjection(harness.guestPlayerId);
        const action = nonCurrentProjection.actions[0] || {};
        const keys = Object.keys(action);

        assert(
            keys.every(key => ["type", "label", "enabled"].includes(key)) &&
                action.enabled === false,
            "Case 22: Non-current viewer action projection uses safe whitelist only"
        );
        harness.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 22 threw", e.message);
    }

    console.log(`===== Multiplayer Action / Turn Sync Test: ${passed} passed, ${failed} failed =====\n`);
}
