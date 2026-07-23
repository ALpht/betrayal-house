import { createSocketHostGameSession } from "../multiplayer/session/createSocketHostGameSession.js";
import { ActionType } from "../scenario/action/ActionType.js";
import { PlayerAction } from "../scenario/action/PlayerAction.js";
import { TransportMessageType } from "../multiplayer/transport/TransportMessageType.js";
import { installTestDom } from "./TestDom.js";

function createTransportHarness() {
    return {
        sent: [],
        listeners: new Set(),
        send(message, options = {}) {
            this.sent.push({ message, options });
            return true;
        },
        subscribe(handler) {
            this.listeners.add(handler);
            return () => this.listeners.delete(handler);
        },
        deliver(message) {
            for (const listener of [...this.listeners]) {
                listener(message);
            }
        },
        destroy() {
            this.listeners.clear();
        }
    };
}

function createCollectAction(playerId, targetId = "relic_1") {
    return new PlayerAction({
        id: `multi-guest-${playerId}-${targetId}`,
        type: ActionType.COLLECT,
        playerId,
        payload: { itemId: "relic", targetId }
    });
}

export function runMultiGuestActionSyncTest() {
    console.log("\n===== Multi-Guest Action Sync Test =====");
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

    const transport = createTransportHarness();
    installTestDom();
    const session = createSocketHostGameSession({
        transport,
        hostClientId: "host-1",
        guestRoster: [
            { guestId: "guest-a", currentConnectionId: "conn-a", displayName: "A", joinOrder: 1 },
            { guestId: "guest-b", currentConnectionId: "conn-b", displayName: "B", joinOrder: 2 }
        ]
    }).start();
    session.localSession.startScenario("relicEscape");

    const bindingA = session.getPlayerBinding("conn-a");
    const bindingB = session.getPlayerBinding("conn-b");
    const beforeDispatch = session.localSession.getDispatchCount();
    transport.deliver({
        type: TransportMessageType.PLAYER_ACTION,
        sessionId: session.sessionId,
        senderId: "conn-a",
        sequence: 1,
        payload: createCollectAction(bindingB.playerId).toJSON()
    });

    assert(
        session.localSession.getDispatchCount() === beforeDispatch,
        "Case 1: Guest cannot act for another Guest playerId"
    );
    assert(
        transport.sent.at(-1)?.message?.payload?.accepted === false,
        "Case 2: Ownership mismatch returns rejected ACTION_RESULT"
    );

    transport.deliver({
        type: TransportMessageType.PLAYER_ACTION,
        sessionId: session.sessionId,
        senderId: "conn-a",
        sequence: 2,
        payload: createCollectAction(bindingA.playerId).toJSON()
    });

    const stateMessages = transport.sent.filter(item =>
        item.message.type === TransportMessageType.STATE_UPDATED
    );
    const targets = new Set(stateMessages.map(item => item.options.targetClientId));
    assert(
        session.localSession.getDispatchCount() === beforeDispatch + 1,
        "Case 3: Valid bound action dispatches once"
    );
    assert(
        targets.has("conn-a") && targets.has("conn-b"),
        "Case 4: Accepted action publishes per-viewer state to all connected Guests"
    );

    session.destroy();
    console.log(`===== Multi-Guest Action Sync Test: ${passed} passed, ${failed} failed =====\n`);
}
