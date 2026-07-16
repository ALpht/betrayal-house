import { ActionType } from "../scenario/action/ActionType.js";
import { InformationAudience } from "../scenario/information/InformationAudience.js";
import { createPlayableRuntime, dispatch, endTurn } from "./PlayableScenarioTestUtils.js";

export function runMaskedHostScenarioTest() {
    console.log("===== Masked Host Scenario Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => ok ? passed++ : (failed++, console.log("[FAIL]", label));

    try {
        const { runtime, router } = createPlayableRuntime("maskedHost");
        assert(runtime.state.get("cluesFound") === 0, "initial clues");
        assert(runtime.state.get("traitorRevealed") === false, "initial reveal false");
        assert(runtime.state.get("destroyedCursedMaskIds").length === 0, "initial masks");

        const packets = router.getAllPackets();
        assert(packets.some(p => p.audience === InformationAudience.HEROES_ONLY), "hero info routed");
        assert(packets.some(p => p.audience === InformationAudience.TRAITOR_ONLY), "traitor info routed");

        dispatch(runtime, {
            id: "mh-traitor-clue",
            type: ActionType.COLLECT,
            playerId: "traitor_1",
            payload: { itemId: "clue" }
        });
        assert(runtime.state.get("cluesFound") === 0, "traitor collect clue no-op");

        dispatch(runtime, {
            id: "mh-bad-clue",
            type: ActionType.COLLECT,
            payload: { itemId: "wrong" }
        });
        assert(runtime.state.get("cluesFound") === 0, "bad clue payload no-op");

        dispatch(runtime, {
            id: "mh-reveal-too-early",
            type: ActionType.INTERACT,
            payload: { interactionType: "revealTraitor" }
        });
        assert(runtime.state.get("traitorRevealed") === false, "reveal disabled before clues");

        for (let i = 0; i < 4; i++) {
            dispatch(runtime, {
                id: `mh-clue-${i}`,
                type: ActionType.COLLECT,
                payload: { itemId: "clue" }
            });
        }
        assert(runtime.state.get("cluesFound") === 3, "clues capped");
        assert(runtime.getActionAvailability().find(a => a.type === ActionType.COLLECT).enabled === false, "collect disabled at cap");

        dispatch(runtime, {
            id: "mh-reveal",
            type: ActionType.INTERACT,
            payload: { interactionType: "revealTraitor" }
        });
        assert(runtime.state.get("traitorRevealed") === true, "traitor revealed");

        dispatch(runtime, {
            id: "mh-traitor-mask",
            type: ActionType.DESTROY,
            playerId: "traitor_1",
            payload: { targetType: "cursedMask", targetId: "cursed_mask_1" }
        });
        assert(runtime.state.get("destroyedCursedMaskIds").length === 0, "traitor destroy no-op");

        dispatch(runtime, {
            id: "mh-mask-1",
            type: ActionType.DESTROY,
            payload: { targetType: "cursedMask", targetId: "cursed_mask_1" }
        });
        dispatch(runtime, {
            id: "mh-mask-dup",
            type: ActionType.DESTROY,
            payload: { targetType: "cursedMask", targetId: "cursed_mask_1" }
        });
        assert(runtime.state.get("destroyedCursedMaskIds").length === 1, "duplicate mask ignored");

        dispatch(runtime, {
            id: "mh-mask-2",
            type: ActionType.DESTROY,
            payload: { targetType: "cursedMask", targetId: "cursed_mask_2" }
        });
        assert(runtime.getActionAvailability().find(a => a.type === ActionType.DESTROY).enabled === false, "destroy disabled at cap");
        assert(runtime.checkVictory()?.winner === "heroes", "hero victory");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] maskedHost hero flow", e.message);
    }

    try {
        const { runtime } = createPlayableRuntime("maskedHost");
        endTurn(runtime, 9);
        assert(runtime.checkVictory()?.winner === "traitor", "traitor turn victory");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] maskedHost traitor flow", e.message);
    }

    try {
        const { runtime } = createPlayableRuntime("maskedHost");
        for (let i = 0; i < 3; i++) {
            dispatch(runtime, {
                id: `mh-snap-clue-${i}`,
                type: ActionType.COLLECT,
                payload: { itemId: "clue" }
            });
        }
        dispatch(runtime, {
            id: "mh-snap-reveal",
            type: ActionType.INTERACT,
            payload: { interactionType: "revealTraitor" }
        });
        const snapshot = runtime.toSnapshot();
        runtime.state.set("traitorRevealed", false);
        runtime.restoreFromSnapshot(snapshot);
        assert(runtime.state.get("traitorRevealed") === true, "snapshot restores reveal");
        assert(runtime.router.getAllPackets().length >= 2, "snapshot preserves information packets");
        runtime.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] maskedHost snapshot", e.message);
    }

    console.log(`===== Masked Host Scenario Test: ${passed} passed, ${failed} failed =====`);
}
