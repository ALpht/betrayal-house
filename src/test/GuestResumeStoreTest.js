import { createGuestResumeStore } from "../multiplayer/lobby/GuestResumeStore.js";

function createMemoryStorage() {
    const values = new Map();
    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
        removeItem(key) {
            values.delete(key);
        }
    };
}

export function runGuestResumeStoreTest() {
    console.log("\n===== Guest Resume Store Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    const storage = createMemoryStorage();
    const store = createGuestResumeStore({
        serverUrl: "http://192.168.0.182:3001",
        storage
    });
    const otherServer = createGuestResumeStore({
        serverUrl: "http://192.168.0.99:3001",
        storage
    });

    assert(store.read("ABCD") === null, "Case 1: Unknown room has no saved identity");
    assert(store.save({
        roomCode: "abcd",
        resumeToken: "token-1",
        displayName: "Phone A",
        lastSequence: 3,
        lastRevision: 7
    }), "Case 2: Resume credential is saved");
    assert(
        JSON.stringify(store.read("ABCD")) === JSON.stringify({
            roomCode: "ABCD",
            resumeToken: "token-1",
            displayName: "Phone A",
            lastSequence: 3,
            lastRevision: 7
        }),
        "Case 3: Saved identity and action progress round-trip"
    );
    assert(otherServer.read("ABCD") === null, "Case 4: Identity is scoped to the Host server");
    store.save({ roomCode: "ABCD", resumeToken: "token-2" });
    assert(
        store.read("ABCD").resumeToken === "token-2" &&
            store.read("ABCD").displayName === "Phone A" &&
            store.read("ABCD").lastSequence === 3,
        "Case 5: Rotated token preserves player metadata"
    );
    store.clear("ABCD");
    assert(store.read("ABCD") === null, "Case 6: Explicit leave clears saved identity");

    console.log(`===== Guest Resume Store Test: ${passed} passed, ${failed} failed =====\n`);
}
