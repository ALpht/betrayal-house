import { createRuntimeId } from "../core/RuntimeId.js";

export function runRuntimeIdTest() {
    console.log("\n===== Runtime ID Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    const nativeId = createRuntimeId("request", {
        cryptoProvider: {
            randomUUID: () => "native-uuid"
        }
    });
    assert(
        nativeId === "request-native-uuid",
        "Case 1: Native randomUUID is used when available"
    );

    const fallbackId = createRuntimeId("request", {
        cryptoProvider: {
            getRandomValues(bytes) {
                bytes.fill(17);
                return bytes;
            }
        }
    });
    assert(
        /^request-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(fallbackId),
        "Case 2: Insecure-context fallback creates a UUID-shaped ID"
    );

    const firstNoCryptoId = createRuntimeId("action", {
        cryptoProvider: null,
        random: () => 0.5,
        now: () => 1000
    });
    const secondNoCryptoId = createRuntimeId("action", {
        cryptoProvider: null,
        random: () => 0.5,
        now: () => 1000
    });
    assert(
        firstNoCryptoId !== secondNoCryptoId,
        "Case 3: No-crypto fallback remains unique within the runtime"
    );

    console.log(`===== Runtime ID Test: ${passed} passed, ${failed} failed =====\n`);
}
