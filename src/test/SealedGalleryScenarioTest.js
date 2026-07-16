import { ActionType } from "../scenario/action/ActionType.js";
import { createPlayableRuntime, dispatch, endTurn } from "./PlayableScenarioTestUtils.js";

export function runSealedGalleryScenarioTest() {
    console.log("===== Sealed Gallery Scenario Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => ok ? passed++ : (failed++, console.log("[FAIL]", label));

    try {
        const { runtime } = createPlayableRuntime("sealedGallery");
        assert(runtime.state.get("symbolsCollected") === 0, "initial symbols");
        assert(runtime.getActionAvailability().find(a => a.type === ActionType.ACTIVATE).enabled === false, "activate disabled before symbols");

        dispatch(runtime, {
            id: "sg-activate-too-early",
            type: ActionType.ACTIVATE,
            payload: { altarId: "moon" }
        });
        assert(runtime.state.get("sequenceIndex") === 0, "early activate no-op");

        for (let i = 0; i < 4; i++) {
            dispatch(runtime, {
                id: `sg-symbol-${i}`,
                type: ActionType.COLLECT,
                payload: { itemId: "symbol" }
            });
        }
        assert(runtime.state.get("symbolsCollected") === 3, "symbols capped");

        dispatch(runtime, {
            id: "sg-malformed",
            type: ActionType.ACTIVATE,
            payload: { altar: "moon" }
        });
        assert(runtime.state.get("mistakes") === 0, "malformed payload no-op");

        dispatch(runtime, {
            id: "sg-wrong",
            type: ActionType.ACTIVATE,
            payload: { altarId: "flame" }
        });
        assert(runtime.state.get("mistakes") === 1, "valid gameplay mistake increments");
        assert(runtime.state.get("sequenceIndex") === 0, "mistake resets sequence");

        for (const altarId of ["moon", "key", "flame"]) {
            dispatch(runtime, {
                id: `sg-${altarId}`,
                type: ActionType.ACTIVATE,
                payload: { altarId }
            });
        }
        assert(runtime.state.get("sequenceIndex") === 3, "sequence complete");
        assert(runtime.checkVictory()?.winner === "heroes", "hero victory");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] sealedGallery hero flow", e.message);
    }

    try {
        const { runtime } = createPlayableRuntime("sealedGallery");
        for (let i = 0; i < 3; i++) {
            dispatch(runtime, {
                id: `sg-traitor-symbol-${i}`,
                type: ActionType.COLLECT,
                payload: { itemId: "symbol" }
            });
        }
        for (let i = 0; i < 3; i++) {
            dispatch(runtime, {
                id: `sg-mistake-${i}`,
                type: ActionType.ACTIVATE,
                payload: { altarId: "flame" }
            });
        }
        assert(runtime.checkVictory()?.winner === "traitor", "traitor mistake victory");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] sealedGallery mistake victory", e.message);
    }

    try {
        const { runtime } = createPlayableRuntime("sealedGallery");
        endTurn(runtime, 10);
        assert(runtime.checkVictory()?.winner === "traitor", "traitor turn victory");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] sealedGallery turn victory", e.message);
    }

    try {
        const { runtime } = createPlayableRuntime("sealedGallery");
        for (let i = 0; i < 3; i++) {
            dispatch(runtime, {
                id: `sg-snap-symbol-${i}`,
                type: ActionType.COLLECT,
                payload: { itemId: "symbol" }
            });
        }
        dispatch(runtime, {
            id: "sg-snap-moon",
            type: ActionType.ACTIVATE,
            payload: { altarId: "moon" }
        });
        const snapshot = runtime.toSnapshot();
        runtime.state.set("sequenceIndex", 0);
        runtime.restoreFromSnapshot(snapshot);
        assert(runtime.state.get("sequenceIndex") === 1, "snapshot restores sequence");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] sealedGallery snapshot", e.message);
    }

    console.log(`===== Sealed Gallery Scenario Test: ${passed} passed, ${failed} failed =====`);
}
