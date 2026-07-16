import { ActionType } from "../scenario/action/ActionType.js";
import { createPlayableRuntime, dispatch, endTurn } from "./PlayableScenarioTestUtils.js";

export function runLostHeirScenarioTest() {
    console.log("===== Lost Heir Scenario Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => ok ? passed++ : (failed++, console.log("[FAIL]", label));

    try {
        const { runtime } = createPlayableRuntime("lostHeir");
        assert(runtime.state.get("escortProgress") === 0, "initial escort");
        assert(runtime.state.get("npcAlive") === true, "initial npc alive");
        assert(runtime.state.get("npcWounds") === 0, "initial npc wounds");

        dispatch(runtime, {
            id: "lh-traitor-escort",
            type: ActionType.INTERACT,
            playerId: "traitor_1",
            payload: { interactionType: "escort" }
        });
        assert(runtime.state.get("escortProgress") === 0, "traitor escort no-op");

        dispatch(runtime, {
            id: "lh-hero-attack",
            type: ActionType.ATTACK,
            playerId: "hero_1",
            payload: { target: "npc" }
        });
        assert(runtime.state.get("npcAlive") === true, "hero attack npc no-op");

        dispatch(runtime, {
            id: "lh-bad-payload",
            type: ActionType.INTERACT,
            payload: { type: "escort" }
        });
        assert(runtime.state.get("escortProgress") === 0, "invalid payload no-op");

        for (let i = 0; i < 4; i++) {
            dispatch(runtime, {
                id: `lh-escort-${i}`,
                type: ActionType.INTERACT,
                payload: { interactionType: "escort" }
            });
        }
        assert(runtime.state.get("escortProgress") === 4, "escort capped at goal");
        assert(runtime.getActionAvailability().find(a => a.type === ActionType.INTERACT).enabled === false, "escort disabled when complete");
        assert(runtime.checkVictory()?.winner === "heroes", "hero victory");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] lostHeir hero flow", e.message);
    }

    try {
        const { runtime } = createPlayableRuntime("lostHeir");
        dispatch(runtime, {
            id: "lh-wound-1",
            type: ActionType.ATTACK,
            playerId: "traitor_1",
            payload: { target: "npc" }
        });
        assert(runtime.state.get("npcWounds") === 1, "traitor wounds npc");
        assert(runtime.state.get("npcAlive") === true, "npc survives first wound");
        assert(runtime.checkVictory() === null, "no traitor victory after one wound");
        dispatch(runtime, {
            id: "lh-wound-2",
            type: ActionType.ATTACK,
            playerId: "traitor_1",
            payload: { target: "npc" }
        });
        assert(runtime.state.get("npcWounds") === 2, "traitor reaches wound cap");
        assert(runtime.state.get("npcAlive") === false, "traitor kills npc after second wound");
        assert(runtime.getActionAvailability().find(a => a.type === ActionType.INTERACT).enabled === false, "escort disabled after npc death");
        assert(runtime.checkVictory()?.winner === "traitor", "traitor npc victory");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] lostHeir traitor attack", e.message);
    }

    try {
        const { runtime } = createPlayableRuntime("lostHeir");
        endTurn(runtime, 8);
        assert(runtime.checkVictory()?.winner === "traitor", "traitor turn victory");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] lostHeir turn victory", e.message);
    }

    try {
        const { runtime } = createPlayableRuntime("lostHeir");
        dispatch(runtime, {
            id: "lh-snap",
            type: ActionType.INTERACT,
            payload: { interactionType: "escort" }
        });
        dispatch(runtime, {
            id: "lh-snap-wound",
            type: ActionType.ATTACK,
            playerId: "traitor_1",
            payload: { target: "npc" }
        });
        const snapshot = runtime.toSnapshot();
        runtime.state.set("escortProgress", 0);
        runtime.state.set("npcWounds", 0);
        runtime.restoreFromSnapshot(snapshot);
        assert(runtime.state.get("escortProgress") === 1, "snapshot restore escort");
        assert(runtime.state.get("npcWounds") === 1, "snapshot restore npc wounds");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] lostHeir snapshot", e.message);
    }

    console.log(`===== Lost Heir Scenario Test: ${passed} passed, ${failed} failed =====`);
}
