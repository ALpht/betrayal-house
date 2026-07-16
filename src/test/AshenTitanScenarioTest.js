import { ActionType } from "../scenario/action/ActionType.js";
import { createPlayableRuntime, dispatch, endTurn } from "./PlayableScenarioTestUtils.js";

export function runAshenTitanScenarioTest() {
    console.log("===== Ashen Titan Scenario Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => ok ? passed++ : (failed++, console.log("[FAIL]", label));

    try {
        const { runtime } = createPlayableRuntime("ashenTitan");
        assert(runtime.state.get("bossHp") === 12, "initial boss hp");
        assert(runtime.state.get("destroyedAnchorIds").length === 0, "initial anchors");
        assert(runtime.getSupportedActions().includes(ActionType.DESTROY), "supports destroy");

        for (let i = 0; i < 8; i++) {
            dispatch(runtime, {
                id: `at-floor0-${i}`,
                type: ActionType.ATTACK,
                payload: { target: "titan" }
            });
        }
        assert(runtime.state.get("bossHp") === 6, "zero-anchor floor");

        dispatch(runtime, {
            id: "at-bad-anchor",
            type: ActionType.DESTROY,
            payload: { targetType: "anchor", targetId: "anchor_x" }
        });
        assert(runtime.state.get("destroyedAnchorIds").length === 0, "invalid anchor no-op");

        dispatch(runtime, {
            id: "at-anchor-1",
            type: ActionType.DESTROY,
            payload: { targetType: "anchor", targetId: "anchor_1" }
        });
        dispatch(runtime, {
            id: "at-anchor-dup",
            type: ActionType.DESTROY,
            payload: { targetType: "anchor", targetId: "anchor_1" }
        });
        assert(runtime.state.get("destroyedAnchorIds").length === 1, "duplicate anchor ignored");

        for (let i = 0; i < 10; i++) {
            dispatch(runtime, {
                id: `at-floor1-${i}`,
                type: ActionType.ATTACK,
                payload: { target: "titan" }
            });
        }
        assert(runtime.state.get("bossHp") === 1, "one-anchor floor");

        dispatch(runtime, {
            id: "at-anchor-2",
            type: ActionType.DESTROY,
            payload: { targetType: "anchor", targetId: "anchor_2" }
        });
        dispatch(runtime, {
            id: "at-final",
            type: ActionType.ATTACK,
            payload: { target: "titan" }
        });
        const heroWin = runtime.checkVictory();
        assert(heroWin?.winner === "heroes", "hero victory");
        assert(runtime.getActionAvailability().find(a => a.type === ActionType.DESTROY).enabled === false, "destroy disabled at cap");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] ashenTitan main flow", e.message);
    }

    try {
        const { runtime } = createPlayableRuntime("ashenTitan");
        endTurn(runtime, 10);
        assert(runtime.checkVictory()?.winner === "traitor", "traitor turn victory");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] ashenTitan traitor flow", e.message);
    }

    try {
        const { runtime } = createPlayableRuntime("ashenTitan");
        dispatch(runtime, {
            id: "at-snap-anchor",
            type: ActionType.DESTROY,
            payload: { targetType: "anchor", targetId: "anchor_1" }
        });
        const snapshot = runtime.toSnapshot();
        runtime.state.set("destroyedAnchorIds", []);
        runtime.restoreFromSnapshot(snapshot);
        assert(runtime.state.get("destroyedAnchorIds").includes("anchor_1"), "snapshot restores anchor identity");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] ashenTitan snapshot", e.message);
    }

    console.log(`===== Ashen Titan Scenario Test: ${passed} passed, ${failed} failed =====`);
}
