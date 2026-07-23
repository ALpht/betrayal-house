import { createSocketHostGameSession } from "../multiplayer/session/createSocketHostGameSession.js";

function createTransportRecorder() {
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
        destroy() {
            this.listeners.clear();
        }
    };
}

export function runDedicatedHostSeparationTest() {
    console.log("\n===== Dedicated Host Separation Test =====");
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

    const transport = createTransportRecorder();
    const session = createSocketHostGameSession({
        transport,
        hostClientId: "host-1",
        guestRoster: [
            { guestId: "guest-a", currentConnectionId: "conn-a", displayName: "A", joinOrder: 1 },
            { guestId: "guest-b", currentConnectionId: "conn-b", displayName: "B", joinOrder: 2 }
        ]
    }).start();

    const bindings = session.getPlayerBindings();
    assert(bindings.length === 2, "Case 1: Only Guests receive bindings");
    assert(session.getPlayerBinding("host-1") === null, "Case 2: Host has no player binding");
    assert(bindings.every(binding => binding.role === "GUEST"), "Case 3: No HOST role binding exists");
    assert(session.getProjection("host-1") === null, "Case 4: Host receives no private projection");
    assert(
        session.getProjection("conn-a")?.viewerId !== session.getProjection("conn-b")?.viewerId,
        "Case 5: Guest projections are per viewer"
    );

    session.destroy();
    console.log(`===== Dedicated Host Separation Test: ${passed} passed, ${failed} failed =====\n`);
}
