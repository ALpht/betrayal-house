import { ActionType } from "../scenario/action/ActionType.js";
import { PlayerAction } from "../scenario/action/PlayerAction.js";
import { GAME_STATE } from "../state/GameStateManager.js";
import { AuthoritativeGameplayActionRouter } from "../gameplay/AuthoritativeGameplayActionRouter.js";

function action(type = ActionType.MOVE) {
    return new PlayerAction({
        id: `phase-${type}`,
        type,
        playerId: "p1",
        payload: type === ActionType.MOVE ? { direction: "north" } : {}
    });
}

export function runGameplayPhaseRouterTest() {
    console.log("\n===== Gameplay Phase Router Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        let phase = GAME_STATE.EXPLORATION;
        let runtime = null;
        let explorationCalls = 0;
        let scenarioCalls = 0;
        const router = new AuthoritativeGameplayActionRouter({
            getGameState: () => phase,
            getRuntime: () => runtime,
            getCurrentPlayerId: () => "p1",
            explorationActionHandler: {
                dispatch() {
                    explorationCalls++;
                    return {
                        accepted: true,
                        reasonCode: null,
                        stateChanged: true,
                        shouldPublish: true
                    };
                },
                getAvailability: () => [{ type: ActionType.END_TURN, enabled: true }]
            },
            executeScenarioAction() {
                scenarioCalls++;
                return { success: true };
            }
        });

        const explorationResult = router.execute(action());
        phase = GAME_STATE.HAUNT;
        runtime = { getActionAvailability: () => [] };
        const scenarioResult = router.execute(action(ActionType.END_TURN));

        assert(
            explorationResult.accepted &&
                scenarioResult.accepted &&
                explorationCalls === 1 &&
                scenarioCalls === 1 &&
                scenarioResult.shouldPublish === true,
            "Case 1: Phase router separates Exploration and Haunt pipelines"
        );

        phase = GAME_STATE.EXPLORATION;
        const invalidExploration = router.execute(action());
        phase = GAME_STATE.HAUNT;
        runtime = null;
        const invalidHaunt = router.execute(action());
        assert(
            !invalidExploration.accepted &&
                !invalidHaunt.accepted &&
                explorationCalls === 1 &&
                scenarioCalls === 1,
            "Case 2: Invalid phase/runtime combinations reject without fallback"
        );
    } catch (error) {
        failed++;
        console.log("[FAIL] Phase router flow threw", error.message);
    }

    console.log(
        `===== Gameplay Phase Router Test: ${passed} passed, ${failed} failed =====\n`
    );
}
