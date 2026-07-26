import { ActionType } from "../scenario/action/ActionType.js";
import { PlayerAction } from "../scenario/action/PlayerAction.js";
import { RoomTile } from "../model/RoomTile.js";
import { TileDeck } from "../model/TileDeck.js";
import { createSocketHostGameSession } from "../multiplayer/session/createSocketHostGameSession.js";
import { TransportMessageType } from "../multiplayer/transport/TransportMessageType.js";
import { installTestDom } from "./TestDom.js";

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
        destroy() {
            subscribers.clear();
        }
    };
}

export function runMultiplayerExplorationRuleTest() {
    installTestDom();
    console.log("\n===== Multiplayer Exploration Rule Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        const transport = createTransport();
        const tileDeck = new TileDeck([
            new RoomTile("event-room", "Event Room", {
                north: true,
                east: false,
                south: false,
                west: false
            }, "event")
        ], { random: () => 0.999999 });
        const host = createSocketHostGameSession({
            transport,
            sessionId: "m17c-session",
            hostClientId: "host",
            guestRoster: [
                {
                    guestId: "guest-a",
                    currentConnectionId: "connection-a",
                    displayName: "A",
                    joinOrder: 1,
                    publicCharacterId: "brandon"
                },
                {
                    guestId: "guest-b",
                    currentConnectionId: "connection-b",
                    displayName: "B",
                    joinOrder: 2,
                    publicCharacterId: "ox"
                }
            ],
            localSessionOptions: {
                containers: createContainers(),
                tileDeck,
                hauntRule: { shouldTrigger: () => false }
            }
        }).start();
        const current = host.localSession.getCurrentPlayer();
        const waiting = host.localSession
            .getPlayerManager()
            .getAllPlayers()
            .find(player => player.id !== current.id);
        const currentProjection = host.getProjection("connection-a");
        const waitingProjection = host.getProjection("connection-b");
        const currentDirections = currentProjection.actions.filter(action =>
            action.type === ActionType.MOVE &&
            action.payload?.direction
        );
        const waitingDirections = waitingProjection.actions.filter(action =>
            action.type === ActionType.MOVE &&
            action.payload?.direction
        );

        assert(
            currentDirections.length === 4 &&
                currentDirections.every(action => action.enabled) &&
                waitingDirections.length === 4 &&
                waitingDirections.every(action => !action.enabled),
            "Case 1: Projection direction enabled state is Host-authoritative"
        );

        transport.sent.length = 0;
        const beforeRevision = host.publisher.getRevision();
        const moveResult = host.executeAndPublish({
            action: new PlayerAction({
                id: "explore-east",
                type: ActionType.MOVE,
                playerId: current.id,
                payload: { direction: "east" }
            })
        });
        const afterRevision = host.publisher.getRevision();
        const publicMap = host.getPublicProjection().map;
        const stateMessages = transport.sent.filter(entry =>
            entry.message.type === TransportMessageType.STATE_UPDATED
        );
        const guestMapA = host.getProjection("connection-a").map;
        const guestMapB = host.getProjection("connection-b").map;

        assert(
            moveResult.accepted &&
                afterRevision === beforeRevision + 2 &&
                stateMessages.length === 2 &&
                publicMap.rooms.length === 2 &&
                publicMap.currentPlayerId === waiting.id &&
                JSON.stringify(guestMapA) === JSON.stringify(publicMap) &&
                JSON.stringify(guestMapB) === JSON.stringify(publicMap),
            "Case 2: One exploration cycle publishes one complete projection per Guest"
        );

        transport.sent.length = 0;
        const revisionBeforeReject = host.publisher.getRevision();
        const rejected = host.executeAndPublish({
            action: new PlayerAction({
                id: "blocked-west",
                type: ActionType.MOVE,
                playerId: waiting.id,
                payload: { direction: "west" }
            })
        });
        assert(
            !rejected.accepted &&
                host.publisher.getRevision() === revisionBeforeReject &&
                transport.sent.length === 0,
            "Case 3: Disabled direction rejects without revision or publish"
        );

        host.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Multiplayer exploration flow threw", error.message);
    }

    console.log(
        `===== Multiplayer Exploration Rule Test: ${passed} passed, ${failed} failed =====\n`
    );
}
