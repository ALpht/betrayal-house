import { InMemoryTransport } from "../multiplayer/transport/InMemoryTransport.js";
import { createGuestGameSession } from "../multiplayer/session/createGuestGameSession.js";
import { TransportMessageType } from "../multiplayer/transport/TransportMessageType.js";

export function runMultiplayerReconnectLifecycleTest() {
    console.log("\n===== Multiplayer Reconnect Lifecycle Test =====");
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
        const { hostEndpoint, guestEndpoint } = InMemoryTransport.createPair();
        const results = [];
        const guest = createGuestGameSession({
            transport: guestEndpoint,
            sessionId: "session-reconnect",
            playerId: "guest-player"
        }).connect();
        guest.subscribe(state => {
            if (state.lastActionResult) {
                results.push(state.lastActionResult);
            }
        });
        guest.sendAction({
            id: "pending-action",
            type: "COLLECT",
            playerId: "guest-player",
            payload: {}
        });
        const before = guest.getSequence();
        const lost = guest.clearPendingForConnectionLost();

        assert(
            before === 1 &&
                lost.sequence === 1 &&
                lost.reasonCode === "CONNECTION_LOST" &&
                lost.source === "LOCAL_TRANSPORT" &&
                guest.getPendingAction() === null &&
                guest.getSequence() === 1,
            "Case 1: Pending action clears locally without reusing sequence"
        );

        const resumed = createGuestGameSession({
            transport: guestEndpoint,
            sessionId: "session-reconnect",
            playerId: "guest-player",
            initialSequence: guest.getSequence(),
            initialRevision: 7,
            recoveryBaseline: true
        }).connect();
        hostEndpoint.send({
            type: TransportMessageType.STATE_UPDATED,
            sessionId: "session-reconnect",
            revision: 6,
            payload: { projection: { stale: true } }
        });
        hostEndpoint.send({
            type: TransportMessageType.STATE_UPDATED,
            sessionId: "session-reconnect",
            revision: 7,
            payload: { projection: { recovered: true } }
        });
        hostEndpoint.send({
            type: TransportMessageType.STATE_UPDATED,
            sessionId: "session-reconnect",
            revision: 7,
            payload: { projection: { duplicate: true } }
        });

        assert(
            resumed.getState().revision === 7 &&
                resumed.getState().projection.recovered === true &&
                resumed.getSequence() === 1,
            "Case 2: Recovery baseline accepts same revision once and rejects lower/duplicate revisions"
        );

        resumed.destroy();
        guest.destroy();
        hostEndpoint.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Lifecycle cases threw", e.message);
    }

    console.log(`===== Multiplayer Reconnect Lifecycle Test: ${passed} passed, ${failed} failed =====\n`);
}
