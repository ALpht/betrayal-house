import { ActionType } from "../scenario/action/ActionType.js";
import { MultiplayerProjectionBuilder } from "../multiplayer/state/MultiplayerProjectionBuilder.js";
import { createSocketHostGameSession } from "../multiplayer/session/createSocketHostGameSession.js";
import { GuestTransportClient } from "../multiplayer/transport/GuestTransportClient.js";
import { TransportMessageType } from "../multiplayer/transport/TransportMessageType.js";
import { MultiplayerUiController } from "../multiplayer/ui/MultiplayerUiController.js";
import {
    MultiplayerConnectionState,
    MultiplayerMode,
    MultiplayerSessionState
} from "../multiplayer/ui/MultiplayerUiState.js";
import { HouseMapPanel } from "../presentation/panel/HouseMapPanel.js";
import { installTestDom } from "./TestDom.js";

function createTransport() {
    const subscribers = new Set();
    const sent = [];
    return {
        sent,
        send(message, options = {}) {
            sent.push({
                message: structuredClone(message),
                options: structuredClone(options)
            });
            return true;
        },
        subscribe(handler) {
            subscribers.add(handler);
            return () => subscribers.delete(handler);
        },
        emit(message) {
            for (const handler of [...subscribers]) {
                handler(structuredClone(message));
            }
        },
        destroy() {
            subscribers.clear();
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

function createHostHarness() {
    const transport = createTransport();
    const host = createSocketHostGameSession({
        transport,
        sessionId: "map-session",
        hostClientId: "host",
        guestRoster: [
            {
                guestId: "guest-a",
                currentConnectionId: "connection-a",
                displayName: "Guest A",
                joinOrder: 1
            },
            {
                guestId: "guest-b",
                currentConnectionId: "connection-b",
                displayName: "Guest B",
                joinOrder: 2
            }
        ],
        localSessionOptions: {
            containers: createContainers(),
            characterIds: ["brandon", "ox"]
        }
    }).start();
    host.localSession.startScenario("relicEscape");
    return { host, transport };
}

function runHiddenTopologyCase(assert) {
    const builder = new MultiplayerProjectionBuilder({
        getMapState: () => ({
            rooms: [
                {
                    roomId: "visible",
                    name: "Visible",
                    x: 0,
                    y: 0,
                    rotation: 0,
                    isRevealed: true,
                    connectedRoomIds: ["hidden"]
                },
                {
                    roomId: "hidden",
                    name: "Secret",
                    x: 1,
                    y: 0,
                    rotation: 0,
                    isRevealed: false,
                    connectedRoomIds: ["visible"]
                }
            ],
            players: [
                { playerId: "p1", displayName: "Visible", roomId: "visible" },
                { playerId: "p2", displayName: "Hidden", roomId: "hidden" }
            ],
            currentPlayerId: "p1"
        })
    });
    const json = JSON.stringify(builder.buildPublic());
    assert(
        !json.includes("hidden") &&
            !json.includes("Secret") &&
            !json.includes("p2") &&
            builder.buildPublic().map.rooms[0].connections.length === 0,
        "Case 1: Hidden room, topology, and marker do not leave Host boundary"
    );
}

function runStaleRevisionCase(assert) {
    const transport = createTransport();
    const root = document.createElement("section");
    const controller = new MultiplayerUiController({
        root,
        mode: MultiplayerMode.GUEST
    });
    const originalRender = HouseMapPanel.prototype.render;
    let renderCount = 0;
    HouseMapPanel.prototype.render = function(model) {
        renderCount++;
        return originalRender.call(this, model);
    };

    try {
        const client = new GuestTransportClient({
            transport,
            sessionId: "stale-map",
            playerId: "p1",
            onStateUpdated: update => controller.update({
                connectionState: MultiplayerConnectionState.CONNECTED,
                sessionState: MultiplayerSessionState.ACTIVE,
                projection: update.projection
            })
        }).connect();
        const projection = name => ({
            map: {
                rooms: [{
                    roomId: 1,
                    name,
                    x: 0,
                    y: 0,
                    rotation: 0,
                    isRevealed: true,
                    connections: []
                }],
                players: [],
                currentPlayerId: null
            },
            actions: [],
            cards: [],
            turn: {},
            victory: { completed: false }
        });
        transport.emit({
            type: TransportMessageType.STATE_UPDATED,
            sessionId: "stale-map",
            revision: 10,
            payload: { projection: projection("Latest") }
        });
        const acceptedRenderCount = renderCount;
        transport.emit({
            type: TransportMessageType.STATE_UPDATED,
            sessionId: "stale-map",
            revision: 9,
            payload: { projection: projection("Stale") }
        });
        assert(
            renderCount === acceptedRenderCount &&
                controller.getModel().houseMapModel.rooms[0].name === "Latest",
            "Case 8: Stale revision does not invoke map render"
        );
        client.destroy();
        controller.destroy();
    } finally {
        HouseMapPanel.prototype.render = originalRender;
    }
}

export function runMultiplayerHouseMapIntegrationTest() {
    installTestDom();
    console.log("\n===== Multiplayer House Map Integration Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        runHiddenTopologyCase(assert);
        const { host, transport } = createHostHarness();
        const guestA = host.getProjection("connection-a");
        const guestB = host.getProjection("connection-b");
        const publicProjection = host.getPublicProjection();

        assert(
            JSON.stringify(guestA.map) === JSON.stringify(guestB.map) &&
                JSON.stringify(guestA.map) === JSON.stringify(publicProjection.map) &&
                Object.keys(publicProjection).length === 1,
            "Case 2: Host and Guests share one public-only map contract"
        );

        const domainRoomName = host.localSession.getGraph().getAllRooms()[0].tile.name;
        publicProjection.map.rooms[0].name = "Changed";
        guestA.map.rooms[0].connections.push("mutated");
        const rebuilt = host.getPublicProjection();
        assert(
            rebuilt.map.rooms[0].name === domainRoomName &&
                !rebuilt.map.rooms[0].connections.includes("mutated") &&
                rebuilt.map !== guestB.map &&
                rebuilt.map.rooms !== guestB.map.rooms,
            "Case 3: Projection mutation cannot affect Domain or another build"
        );

        let publicNotifications = 0;
        const unsubscribe = host.subscribePublicProjection(() => {
            publicNotifications++;
        });
        transport.sent.length = 0;
        const noTargetMessages = host.publishAuthoritativeState({
            connectedClientIds: []
        });
        assert(
            noTargetMessages.length === 0 && publicNotifications === 1,
            "Case 4: Public projection publishes without fanout targets"
        );

        const entranceRoomId = rebuilt.map.players[0].roomId;
        const moved = host.localSession.move("east");
        host.publishAuthoritativeState();
        const movedProjection = host.getPublicProjection();
        assert(
            moved &&
                movedProjection.map.rooms.length === 2 &&
                movedProjection.map.players.some(player =>
                    player.roomId !== entranceRoomId
                ),
            "Case 5: Authoritative movement and reveal update public markers"
        );

        const originalDispatch = host.localSession.dispatchScenarioAction.bind(host.localSession);
        let dispatchCount = 0;
        host.localSession.dispatchScenarioAction = action => {
            dispatchCount++;
            return originalDispatch(action);
        };
        publicNotifications = 0;
        transport.sent.length = 0;
        const currentPlayer = host.localSession.getCurrentPlayer();
        const result = host.executeAndPublish({
            action: {
                id: "map-end-turn",
                type: ActionType.END_TURN,
                playerId: currentPlayer.id,
                payload: {}
            }
        });
        const stateMessages = transport.sent.filter(item =>
            item.message.type === TransportMessageType.STATE_UPDATED
        );
        assert(
            result.accepted &&
                dispatchCount === 1 &&
                publicNotifications === 1 &&
                stateMessages.length === 2 &&
                host.getPublicProjection().map.currentPlayerId !== currentPlayer.id,
            "Case 6: END_TURN dispatches once and publishes one authoritative cycle"
        );

        transport.sent.length = 0;
        host.publishGuestState("connection-a");
        const resumeProjection = transport.sent.at(-1)?.message.payload?.projection;
        assert(
            resumeProjection?.map?.rooms?.length === 2 &&
                JSON.stringify(resumeProjection.map) === JSON.stringify(host.getPublicProjection().map),
            "Case 7: Targeted reconnect projection contains latest complete map"
        );

        unsubscribe();
        host.destroy();
        runStaleRevisionCase(assert);
    } catch (error) {
        failed++;
        console.log("[FAIL] Multiplayer House Map Integration threw", error.message);
    }

    console.log(`===== Multiplayer House Map Integration Test: ${passed} passed, ${failed} failed =====\n`);
}
