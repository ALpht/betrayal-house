import { ActionType } from "../scenario/action/ActionType.js";
import { createPlayableRuntime, dispatch, endTurn } from "./PlayableScenarioTestUtils.js";

export function runRelicEscapeScenarioTest() {
    console.log("===== Relic Escape Scenario Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => ok ? passed++ : (failed++, console.log("[FAIL]", label));

    try {
        const { runtime } = createPlayableRuntime("relicEscape");
        assert(runtime.state.get("collectedRelicIds").length === 0, "initial relic list");
        assert(runtime.state.get("exitReached") === false, "initial exit false");
        assert(runtime.getSupportedActions().includes(ActionType.COLLECT), "supports collect");

        dispatch(runtime, {
            id: "re-dup-1",
            type: ActionType.COLLECT,
            payload: { itemId: "relic", targetId: "relic_1" }
        });
        dispatch(runtime, {
            id: "re-dup-2",
            type: ActionType.COLLECT,
            payload: { itemId: "relic", targetId: "relic_1" }
        });
        assert(runtime.state.get("collectedRelicIds").length === 1, "duplicate relic ignored");

        dispatch(runtime, {
            id: "re-invalid",
            type: ActionType.COLLECT,
            payload: { itemId: "relic" }
        });
        assert(runtime.state.get("collectedRelicIds").length === 1, "invalid payload no-op");

        dispatch(runtime, {
            id: "re-move-too-early",
            type: ActionType.MOVE,
            payload: { destination: "exit" }
        });
        assert(runtime.state.get("exitReached") === false, "cannot exit before relics");

        dispatch(runtime, {
            id: "re-2",
            type: ActionType.COLLECT,
            payload: { itemId: "relic", targetId: "relic_2" }
        });
        dispatch(runtime, {
            id: "re-3",
            type: ActionType.COLLECT,
            payload: { itemId: "relic", targetId: "relic_3" }
        });
        const availability = runtime.getActionAvailability();
        assert(availability.find(a => a.type === ActionType.COLLECT).enabled === false, "collect disabled at cap");
        assert(availability.find(a => a.type === ActionType.MOVE).enabled === true, "move enabled after relics");

        dispatch(runtime, {
            id: "re-exit",
            type: ActionType.MOVE,
            payload: { destination: "exit" }
        });
        const heroWin = runtime.checkVictory();
        assert(heroWin?.winner === "heroes", "hero victory");

        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] relicEscape main flow", e.message);
    }

    try {
        const { runtime } = createPlayableRuntime("relicEscape");
        endTurn(runtime, 8);
        const traitorWin = runtime.checkVictory();
        assert(traitorWin?.winner === "traitor", "traitor turn victory");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] relicEscape traitor flow", e.message);
    }

    try {
        const { runtime } = createPlayableRuntime("relicEscape");
        dispatch(runtime, {
            id: "re-snap-1",
            type: ActionType.COLLECT,
            payload: { itemId: "relic", targetId: "relic_1" }
        });
        const snapshot = runtime.toSnapshot();
        runtime.state.set("collectedRelicIds", []);
        runtime.restoreFromSnapshot(snapshot);
        dispatch(runtime, {
            id: "re-snap-2",
            type: ActionType.COLLECT,
            payload: { itemId: "relic", targetId: "relic_2" }
        });
        assert(runtime.state.get("collectedRelicIds").length === 2, "snapshot continue");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] relicEscape snapshot", e.message);
    }

    try {
        const a = createPlayableRuntime("relicEscape");
        const b = createPlayableRuntime("relicEscape");
        dispatch(a.runtime, {
            id: "re-iso",
            type: ActionType.COLLECT,
            payload: { itemId: "relic", targetId: "relic_1" }
        });
        assert(b.runtime.state.get("collectedRelicIds").length === 0, "runtime isolation");
        a.runtime.destroy();
        b.runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] relicEscape isolation", e.message);
    }

    console.log(`===== Relic Escape Scenario Test: ${passed} passed, ${failed} failed =====`);
}
