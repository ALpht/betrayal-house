import { ActionType } from "../scenario/action/ActionType.js";
import { createPlayableRuntime, dispatch, endTurn } from "./PlayableScenarioTestUtils.js";

const PLAYER_COUNTS = [2, 4];

function resultOf(runtime) {
    const result = runtime.checkVictory();
    return result
        ? { result: result.winner, victoryReason: result.reason }
        : { result: "none", victoryReason: null };
}

function availability(runtime, type) {
    return runtime.getActionAvailability().find(a => a.type === type);
}

function assertRestoreConsistent(runtime) {
    const before = runtime.toSnapshot();
    runtime.restoreFromSnapshot(before);
    const after = runtime.toSnapshot();
    return JSON.stringify(before) === JSON.stringify(after);
}

function pushRecord(records, data) {
    records.push({
        scenarioId: data.scenarioId,
        sampleName: data.sampleName,
        playerCount: data.playerCount,
        result: data.result,
        victoryReason: data.victoryReason,
        turnsElapsed: data.turnsElapsed,
        meaningfulActionCount: data.meaningfulActionCount,
        blockedActionCount: data.blockedActionCount,
        requiredUniqueTargets: data.requiredUniqueTargets,
        restoreConsistent: data.restoreConsistent,
        notes: data.notes
    });
}

function runForPlayerCounts(records, sampleName, factory) {
    for (const playerCount of PLAYER_COUNTS) {
        factory(playerCount, sampleName);
    }
}

function addRelicEscapeBaselines(records, assert) {
    runForPlayerCounts(records, "fast hero", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("relicEscape", { playerCount });
        for (const id of ["relic_1", "relic_2", "relic_3"]) {
            dispatch(runtime, {
                id: `balance-relic-${id}`,
                type: ActionType.COLLECT,
                payload: { itemId: "relic", targetId: id }
            });
        }
        dispatch(runtime, {
            id: "balance-relic-exit",
            type: ActionType.MOVE,
            payload: { destination: "exit" }
        });
        const result = resultOf(runtime);
        const restoreConsistent = assertRestoreConsistent(runtime);
        assert(result.result === "heroes" && result.victoryReason === "relics_escaped", "relicEscape hero path reachable");
        assert(restoreConsistent, "relicEscape restore consistent");
        pushRecord(records, {
            scenarioId: "relicEscape",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 4,
            blockedActionCount: 0,
            requiredUniqueTargets: 3,
            restoreConsistent,
            notes: "Three unique relic targets and exit are required."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "slow hero", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("relicEscape", { playerCount });
        const earlyExit = availability(runtime, ActionType.MOVE);
        dispatch(runtime, {
            id: "balance-relic-blocked-exit",
            type: ActionType.MOVE,
            payload: { destination: "exit" }
        });
        for (const id of ["relic_1", "relic_2", "relic_3"]) {
            dispatch(runtime, {
                id: `balance-relic-slow-${id}`,
                type: ActionType.COLLECT,
                payload: { itemId: "relic", targetId: id }
            });
        }
        assert(runtime.state.get("exitReached") === false, "relicEscape blocked exit does not mutate state");
        assert(availability(runtime, ActionType.MOVE).enabled === true, "relicEscape exit unlocks after relics");
        dispatch(runtime, {
            id: "balance-relic-slow-exit",
            type: ActionType.MOVE,
            payload: { destination: "exit" }
        });
        const result = resultOf(runtime);
        pushRecord(records, {
            scenarioId: "relicEscape",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 4,
            blockedActionCount: earlyExit.enabled ? 0 : 1,
            requiredUniqueTargets: 3,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Slow path includes one blocked exit before relic completion."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "traitor pressure", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("relicEscape", { playerCount });
        endTurn(runtime, 7);
        assert(resultOf(runtime).result === "none", "relicEscape pressure turn has not timed out");
        pushRecord(records, {
            scenarioId: "relicEscape",
            sampleName,
            playerCount,
            ...resultOf(runtime),
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 0,
            blockedActionCount: 0,
            requiredUniqueTargets: 3,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "One turn before timeout, heroes still need relic progress or exit."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "timeout", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("relicEscape", { playerCount });
        endTurn(runtime, 7);
        assert(resultOf(runtime).result === "none", "relicEscape no timeout before limit");
        endTurn(runtime, 1);
        const result = resultOf(runtime);
        assert(result.result === "traitor" && result.victoryReason === "exit_sealed", "relicEscape timeout victory");
        pushRecord(records, {
            scenarioId: "relicEscape",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 0,
            blockedActionCount: 0,
            requiredUniqueTargets: 3,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Turn 8 seals the exit."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "invalid / blocked", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("relicEscape", { playerCount });
        dispatch(runtime, {
            id: "balance-relic-invalid",
            type: ActionType.COLLECT,
            payload: { itemId: "relic" }
        });
        dispatch(runtime, {
            id: "balance-relic-early-exit",
            type: ActionType.MOVE,
            payload: { destination: "exit" }
        });
        assert(runtime.state.get("collectedRelicIds").length === 0, "relicEscape invalid collect no-op");
        assert(runtime.state.get("exitReached") === false, "relicEscape early exit no-op");
        pushRecord(records, {
            scenarioId: "relicEscape",
            sampleName,
            playerCount,
            ...resultOf(runtime),
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 0,
            blockedActionCount: 2,
            requiredUniqueTargets: 3,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Malformed collect and premature exit do not mutate progress."
        });
        runtime.destroy();
    });
}

function addAshenTitanBaselines(records, assert) {
    runForPlayerCounts(records, "fast hero", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("ashenTitan", { playerCount });
        for (let i = 0; i < 6; i++) {
            dispatch(runtime, { id: `balance-titan-0-${i}`, type: ActionType.ATTACK, payload: { target: "titan" } });
        }
        assert(runtime.state.get("bossHp") === 6, "ashenTitan zero-anchor floor reached");
        assert(availability(runtime, ActionType.ATTACK).enabled === false, "ashenTitan zero-anchor attack gated at floor");
        dispatch(runtime, { id: "balance-titan-anchor-1", type: ActionType.DESTROY, payload: { targetType: "anchor", targetId: "anchor_1" } });
        for (let i = 0; i < 5; i++) {
            dispatch(runtime, { id: `balance-titan-1-${i}`, type: ActionType.ATTACK, payload: { target: "titan" } });
        }
        assert(runtime.state.get("bossHp") === 1, "ashenTitan one-anchor floor reached");
        dispatch(runtime, { id: "balance-titan-anchor-2", type: ActionType.DESTROY, payload: { targetType: "anchor", targetId: "anchor_2" } });
        dispatch(runtime, { id: "balance-titan-final", type: ActionType.ATTACK, payload: { target: "titan" } });
        const result = resultOf(runtime);
        assert(result.result === "heroes" && result.victoryReason === "titan_defeated", "ashenTitan hero path reachable");
        pushRecord(records, {
            scenarioId: "ashenTitan",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 14,
            blockedActionCount: 0,
            requiredUniqueTargets: 2,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "0 anchors allow 6 effective damage, 1 anchor allows 5 more, 2 anchors leave 1 attack."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "slow hero", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("ashenTitan", { playerCount });
        for (let i = 0; i < 7; i++) {
            dispatch(runtime, { id: `balance-titan-slow-${i}`, type: ActionType.ATTACK, payload: { target: "titan" } });
        }
        assert(runtime.state.get("bossHp") === 6, "ashenTitan extra capped attack does not pass floor");
        dispatch(runtime, { id: "balance-titan-slow-anchor", type: ActionType.DESTROY, payload: { targetType: "anchor", targetId: "anchor_1" } });
        pushRecord(records, {
            scenarioId: "ashenTitan",
            sampleName,
            playerCount,
            ...resultOf(runtime),
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 7,
            blockedActionCount: 1,
            requiredUniqueTargets: 2,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Slow path includes one capped attack before anchor progress."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "traitor pressure", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("ashenTitan", { playerCount });
        endTurn(runtime, 9);
        assert(resultOf(runtime).result === "none", "ashenTitan pressure turn has not timed out");
        assert(runtime.state.get("bossHp") === 12, "ashenTitan pressure leaves boss alive");
        pushRecord(records, {
            scenarioId: "ashenTitan",
            sampleName,
            playerCount,
            ...resultOf(runtime),
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 0,
            blockedActionCount: 0,
            requiredUniqueTargets: 2,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "One turn before timeout, Titan survival pressure is active."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "timeout", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("ashenTitan", { playerCount });
        endTurn(runtime, 9);
        assert(resultOf(runtime).result === "none", "ashenTitan no timeout before limit");
        endTurn(runtime, 1);
        const result = resultOf(runtime);
        assert(result.result === "traitor" && result.victoryReason === "titan_survived", "ashenTitan timeout victory");
        pushRecord(records, {
            scenarioId: "ashenTitan",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 0,
            blockedActionCount: 0,
            requiredUniqueTargets: 2,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Turn 10 traitor win if Titan survives."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "invalid / blocked", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("ashenTitan", { playerCount });
        dispatch(runtime, { id: "balance-titan-bad-anchor", type: ActionType.DESTROY, payload: { targetType: "anchor", targetId: "anchor_x" } });
        dispatch(runtime, { id: "balance-titan-bad-attack", type: ActionType.ATTACK, payload: { target: "wrong" } });
        assert(runtime.state.get("destroyedAnchorIds").length === 0, "ashenTitan invalid anchor no-op");
        assert(runtime.state.get("bossHp") === 12, "ashenTitan invalid attack no-op");
        pushRecord(records, {
            scenarioId: "ashenTitan",
            sampleName,
            playerCount,
            ...resultOf(runtime),
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 0,
            blockedActionCount: 2,
            requiredUniqueTargets: 2,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Invalid anchor and wrong attack target do not mutate state."
        });
        runtime.destroy();
    });
}

function addLostHeirBaselines(records, assert) {
    runForPlayerCounts(records, "fast hero", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("lostHeir", { playerCount });
        for (let i = 0; i < 4; i++) {
            dispatch(runtime, { id: `balance-heir-escort-${i}`, type: ActionType.INTERACT, payload: { interactionType: "escort" } });
        }
        const result = resultOf(runtime);
        assert(result.result === "heroes" && result.victoryReason === "heir_escorted", "lostHeir hero path reachable");
        pushRecord(records, {
            scenarioId: "lostHeir",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 4,
            blockedActionCount: 0,
            requiredUniqueTargets: 1,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Earliest hero completion is four escort actions."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "traitor pressure", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("lostHeir", { playerCount });
        dispatch(runtime, { id: "balance-heir-wound-1", type: ActionType.ATTACK, playerId: "traitor_1", payload: { target: "npc" } });
        assert(runtime.state.get("npcAlive") === true, "lostHeir first wound does not immediately kill NPC");
        assert(resultOf(runtime).result === "none", "lostHeir first wound is pressure, not victory");
        dispatch(runtime, { id: "balance-heir-wound-2", type: ActionType.ATTACK, playerId: "traitor_1", payload: { target: "npc" } });
        const result = resultOf(runtime);
        assert(result.result === "traitor" && result.victoryReason === "heir_lost", "lostHeir traitor kill path reachable");
        pushRecord(records, {
            scenarioId: "lostHeir",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 2,
            blockedActionCount: 0,
            requiredUniqueTargets: 1,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Earliest traitor kill is now two attacks, compared with four escort actions."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "slow hero", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("lostHeir", { playerCount });
        dispatch(runtime, { id: "balance-heir-slow-wound", type: ActionType.ATTACK, playerId: "traitor_1", payload: { target: "npc" } });
        dispatch(runtime, { id: "balance-heir-slow-invalid", type: ActionType.INTERACT, payload: { interactionType: "wait" } });
        for (let i = 0; i < 4; i++) {
            dispatch(runtime, { id: `balance-heir-slow-escort-${i}`, type: ActionType.INTERACT, payload: { interactionType: "escort" } });
        }
        const result = resultOf(runtime);
        assert(result.result === "heroes", "lostHeir slow hero path remains reachable");
        pushRecord(records, {
            scenarioId: "lostHeir",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 5,
            blockedActionCount: 1,
            requiredUniqueTargets: 1,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Slow path includes one traitor pressure action and one invalid escort payload."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "timeout", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("lostHeir", { playerCount });
        endTurn(runtime, 7);
        assert(resultOf(runtime).result === "none", "lostHeir no timeout before limit");
        endTurn(runtime, 1);
        const result = resultOf(runtime);
        assert(result.result === "traitor" && result.victoryReason === "escort_failed", "lostHeir timeout victory");
        pushRecord(records, {
            scenarioId: "lostHeir",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 0,
            blockedActionCount: 0,
            requiredUniqueTargets: 1,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Turn 8 traitor win by delay."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "invalid / blocked", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("lostHeir", { playerCount });
        dispatch(runtime, { id: "balance-heir-hero-attack", type: ActionType.ATTACK, playerId: "hero_1", payload: { target: "npc" } });
        dispatch(runtime, { id: "balance-heir-traitor-escort", type: ActionType.INTERACT, playerId: "traitor_1", payload: { interactionType: "escort" } });
        assert(runtime.state.get("npcAlive") === true, "lostHeir hero attack no-op");
        assert(runtime.state.get("npcWounds") === 0, "lostHeir invalid attack leaves wounds unchanged");
        assert(runtime.state.get("escortProgress") === 0, "lostHeir traitor escort no-op");
        pushRecord(records, {
            scenarioId: "lostHeir",
            sampleName,
            playerCount,
            ...resultOf(runtime),
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 0,
            blockedActionCount: 2,
            requiredUniqueTargets: 1,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Unauthorized hero attack and traitor escort do not mutate progress."
        });
        runtime.destroy();
    });
}

function addSealedGalleryBaselines(records, assert) {
    runForPlayerCounts(records, "fast hero", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("sealedGallery", { playerCount });
        for (let i = 0; i < 3; i++) {
            dispatch(runtime, { id: `balance-gallery-symbol-${i}`, type: ActionType.COLLECT, payload: { itemId: "symbol" } });
        }
        for (const altarId of ["moon", "key", "flame"]) {
            dispatch(runtime, { id: `balance-gallery-${altarId}`, type: ActionType.ACTIVATE, payload: { altarId } });
        }
        const result = resultOf(runtime);
        assert(result.result === "heroes" && result.victoryReason === "gallery_unsealed", "sealedGallery hero path reachable");
        pushRecord(records, {
            scenarioId: "sealedGallery",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 6,
            blockedActionCount: 0,
            requiredUniqueTargets: 3,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Three symbols and three ordered activations are required."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "slow hero", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("sealedGallery", { playerCount });
        for (let i = 0; i < 3; i++) {
            dispatch(runtime, { id: `balance-gallery-slow-symbol-${i}`, type: ActionType.COLLECT, payload: { itemId: "symbol" } });
        }
        dispatch(runtime, { id: "balance-gallery-wrong", type: ActionType.ACTIVATE, payload: { altarId: "flame" } });
        assert(runtime.state.get("mistakes") === 1, "sealedGallery valid wrong altar increments mistake");
        assert(runtime.state.get("sequenceIndex") === 0, "sealedGallery wrong altar resets sequence");
        for (const altarId of ["moon", "key", "flame"]) {
            dispatch(runtime, { id: `balance-gallery-slow-${altarId}`, type: ActionType.ACTIVATE, payload: { altarId } });
        }
        const result = resultOf(runtime);
        assert(result.result === "heroes", "sealedGallery slow hero path remains reachable");
        pushRecord(records, {
            scenarioId: "sealedGallery",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 7,
            blockedActionCount: 0,
            requiredUniqueTargets: 3,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Slow path includes one valid gameplay mistake."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "invalid / blocked", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("sealedGallery", { playerCount });
        dispatch(runtime, { id: "balance-gallery-malformed", type: ActionType.ACTIVATE, payload: { altarId: "bad" } });
        assert(runtime.state.get("mistakes") === 0, "sealedGallery malformed altar does not add mistake");
        for (let i = 0; i < 3; i++) {
            dispatch(runtime, { id: `balance-gallery-invalid-symbol-${i}`, type: ActionType.COLLECT, payload: { itemId: "symbol" } });
        }
        dispatch(runtime, { id: "balance-gallery-valid-wrong", type: ActionType.ACTIVATE, payload: { altarId: "key" } });
        assert(runtime.state.get("mistakes") === 1, "sealedGallery valid wrong altar adds mistake");
        pushRecord(records, {
            scenarioId: "sealedGallery",
            sampleName,
            playerCount,
            ...resultOf(runtime),
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 4,
            blockedActionCount: 1,
            requiredUniqueTargets: 3,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Malformed payload is no-op; valid wrong altar is a gameplay mistake."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "traitor pressure", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("sealedGallery", { playerCount });
        for (let i = 0; i < 3; i++) {
            dispatch(runtime, { id: `balance-gallery-pressure-symbol-${i}`, type: ActionType.COLLECT, payload: { itemId: "symbol" } });
        }
        for (let i = 0; i < 3; i++) {
            dispatch(runtime, { id: `balance-gallery-pressure-wrong-${i}`, type: ActionType.ACTIVATE, payload: { altarId: "key" } });
        }
        const result = resultOf(runtime);
        assert(result.result === "traitor" && result.victoryReason === "too_many_mistakes", "sealedGallery mistake traitor victory");
        pushRecord(records, {
            scenarioId: "sealedGallery",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 6,
            blockedActionCount: 0,
            requiredUniqueTargets: 3,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Three valid wrong altar activations trigger mistake-based traitor victory."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "timeout", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("sealedGallery", { playerCount });
        endTurn(runtime, 9);
        assert(resultOf(runtime).result === "none", "sealedGallery no timeout before limit");
        endTurn(runtime, 1);
        const result = resultOf(runtime);
        assert(result.result === "traitor" && result.victoryReason === "gallery_sealed", "sealedGallery timeout victory");
        pushRecord(records, {
            scenarioId: "sealedGallery",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 0,
            blockedActionCount: 0,
            requiredUniqueTargets: 3,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Turn 10 traitor win by delay."
        });
        runtime.destroy();
    });
}

function addMaskedHostBaselines(records, assert) {
    runForPlayerCounts(records, "fast hero", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("maskedHost", { playerCount });
        for (let i = 0; i < 3; i++) {
            dispatch(runtime, { id: `balance-host-clue-${i}`, type: ActionType.COLLECT, payload: { itemId: "clue" } });
        }
        dispatch(runtime, { id: "balance-host-reveal", type: ActionType.INTERACT, payload: { interactionType: "revealTraitor" } });
        for (const targetId of ["cursed_mask_1", "cursed_mask_2"]) {
            dispatch(runtime, { id: `balance-host-${targetId}`, type: ActionType.DESTROY, payload: { targetType: "cursedMask", targetId } });
        }
        const result = resultOf(runtime);
        assert(result.result === "heroes" && result.victoryReason === "host_unmasked", "maskedHost hero path reachable");
        pushRecord(records, {
            scenarioId: "maskedHost",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 6,
            blockedActionCount: 0,
            requiredUniqueTargets: 2,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Three clues, reveal, and two masks are required."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "slow hero", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("maskedHost", { playerCount });
        const prematureDestroy = availability(runtime, ActionType.DESTROY);
        dispatch(runtime, { id: "balance-host-premature-mask", type: ActionType.DESTROY, payload: { targetType: "cursedMask", targetId: "cursed_mask_1" } });
        for (let i = 0; i < 3; i++) {
            dispatch(runtime, { id: `balance-host-slow-clue-${i}`, type: ActionType.COLLECT, payload: { itemId: "clue" } });
        }
        dispatch(runtime, { id: "balance-host-slow-reveal", type: ActionType.INTERACT, payload: { interactionType: "revealTraitor" } });
        dispatch(runtime, { id: "balance-host-slow-mask-1", type: ActionType.DESTROY, payload: { targetType: "cursedMask", targetId: "cursed_mask_1" } });
        dispatch(runtime, { id: "balance-host-slow-mask-2", type: ActionType.DESTROY, payload: { targetType: "cursedMask", targetId: "cursed_mask_2" } });
        const result = resultOf(runtime);
        assert(result.result === "heroes", "maskedHost slow hero path remains reachable");
        pushRecord(records, {
            scenarioId: "maskedHost",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 6,
            blockedActionCount: prematureDestroy.enabled ? 0 : 1,
            requiredUniqueTargets: 2,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Slow path includes one premature mask destroy attempt."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "traitor pressure", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("maskedHost", { playerCount });
        endTurn(runtime, 8);
        assert(resultOf(runtime).result === "none", "maskedHost pressure turn has not timed out");
        pushRecord(records, {
            scenarioId: "maskedHost",
            sampleName,
            playerCount,
            ...resultOf(runtime),
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 0,
            blockedActionCount: 0,
            requiredUniqueTargets: 2,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "One turn before masquerade completion, hidden traitor pressure is active."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "timeout", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("maskedHost", { playerCount });
        endTurn(runtime, 8);
        assert(resultOf(runtime).result === "none", "maskedHost no timeout before limit");
        endTurn(runtime, 1);
        const result = resultOf(runtime);
        assert(result.result === "traitor" && result.victoryReason === "masquerade_complete", "maskedHost timeout victory");
        pushRecord(records, {
            scenarioId: "maskedHost",
            sampleName,
            playerCount,
            ...result,
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 0,
            blockedActionCount: 0,
            requiredUniqueTargets: 2,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Turn 9 traitor win by delay."
        });
        runtime.destroy();
    });

    runForPlayerCounts(records, "invalid / blocked", (playerCount, sampleName) => {
        const { runtime } = createPlayableRuntime("maskedHost", { playerCount });
        const heroPackets = runtime.router.getVisiblePackets("hero_1", "traitor_1");
        const traitorPackets = runtime.router.getVisiblePackets("traitor_1", "traitor_1");
        assert(heroPackets.every(p => p.id !== "maskedHost_traitor_objective"), "maskedHost traitor packet hidden from heroes");
        assert(traitorPackets.some(p => p.id === "maskedHost_traitor_objective"), "maskedHost traitor packet visible to traitor");
        const destroyReason = availability(runtime, ActionType.DESTROY)?.reason || "";
        assert(!destroyReason.includes("traitor_1"), "maskedHost availability reason does not expose traitor id");
        const snapshot = runtime.toSnapshot();
        runtime.restoreFromSnapshot(snapshot);
        const heroPacketsAfterRestore = runtime.router.getVisiblePackets("hero_1", "traitor_1");
        assert(heroPacketsAfterRestore.every(p => p.id !== "maskedHost_traitor_objective"), "maskedHost restore preserves hero visibility");
        pushRecord(records, {
            scenarioId: "maskedHost",
            sampleName,
            playerCount,
            ...resultOf(runtime),
            turnsElapsed: runtime.state.get("turnsElapsed"),
            meaningfulActionCount: 0,
            blockedActionCount: 1,
            requiredUniqueTargets: 2,
            restoreConsistent: assertRestoreConsistent(runtime),
            notes: "Visibility and premature destroy are checked without leaking traitor-only objectives."
        });
        runtime.destroy();
    });
}

export function runPlayableScenarioBalanceTest() {
    console.log("===== Playable Scenario Balance Test =====");
    let passed = 0;
    let failed = 0;
    const records = [];
    const assert = (ok, label) => ok ? passed++ : (failed++, console.log("[FAIL]", label));

    try {
        addRelicEscapeBaselines(records, assert);
        addAshenTitanBaselines(records, assert);
        addLostHeirBaselines(records, assert);
        addSealedGalleryBaselines(records, assert);
        addMaskedHostBaselines(records, assert);

        const scenarioIds = new Set(records.map(r => r.scenarioId));
        const sampleKeys = new Set(records.map(r => `${r.scenarioId}:${r.sampleName}`));
        assert(scenarioIds.size === 5, "balance records cover all five scenarios");
        assert([...records].every(r => r.playerCount === 2 || r.playerCount === 4), "balance records include explicit player counts");
        assert([...records].every(r => r.restoreConsistent === true), "all balance samples restore consistently");
        assert(sampleKeys.has("lostHeir:traitor pressure"), "lostHeir compares traitor pressure path");
        assert(sampleKeys.has("maskedHost:invalid / blocked"), "maskedHost visibility sample recorded");
    } catch (e) {
        failed++;
        console.log("[FAIL] playable scenario balance suite", e.message);
    }

    console.log("[BALANCE BASELINE]", JSON.stringify(records, null, 2));
    console.log(`===== Playable Scenario Balance Test: ${passed} passed, ${failed} failed =====`);
}
