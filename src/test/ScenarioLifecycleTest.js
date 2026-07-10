import { HauntScenario }
    from "../scenario/HauntScenario.js";

import { ScenarioRuntimeFactory }
    from "../scenario/ScenarioRuntimeFactory.js";

import { ScenarioRuntime }
    from "../scenario/runtime/ScenarioRuntime.js";

import { ScenarioContext }
    from "../scenario/runtime/ScenarioContext.js";

import { ScenarioLifecycle }
    from "../scenario/lifecycle/ScenarioLifecycle.js";

import { ScenarioLifecycleState }
    from "../scenario/lifecycle/ScenarioLifecycleState.js";

import { LifecycleError }
    from "../scenario/lifecycle/LifecycleError.js";

import { InformationRouter }
    from "../scenario/information/InformationRouter.js";

import { InformationPacket }
    from "../scenario/information/InformationPacket.js";

import { InformationAudience }
    from "../scenario/information/InformationAudience.js";

import { InformationScope }
    from "../scenario/information/InformationScope.js";

class TestLifecycleScenario
    extends HauntScenario {

    static meta = {
        id: "lifecycleTest"
    };

    start(context, state) {
        super.start(context, state);
    }
}

const MOCK_CONTEXT =
    new ScenarioContext({
        players: {
            getAllPlayers: () => []
        },
        gameState: {
            getState: () => "HAUNT"
        },
        graphMap: {
            getAllRooms: () => []
        },
        cardManager: {
            eventDeck: {},
            itemDeck: {},
            omenDeck: {}
        }
    });

export function
    runScenarioLifecycleTest() {

    console.log(
        "===== Scenario Lifecycle Test ====="
    );

    /* =========================
     * CASE 1: Create Runtime
     *   lifecycleState === "created"
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        console.log(
            "[CASE 1] runtime exists:",
            runtime !== null
        );

        console.log(
            "[CASE 1] initial lifecycleState:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.CREATED
        );

        console.log(
            "[CASE 1] isActive is false before start:",
            runtime.isActive === false
        );
    }

    /* =========================
     * CASE 2: Start
     *   CREATED → STARTED
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        runtime.start();

        console.log(
            "[CASE 2] lifecycleState after start:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.STARTED
        );

        console.log(
            "[CASE 2] isActive is true:",
            runtime.isActive === true
        );
    }

    /* =========================
     * CASE 3: Pause / Resume
     *   STARTED → PAUSED → STARTED
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        runtime.start();

        runtime.pause();

        console.log(
            "[CASE 3] lifecycleState after pause:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.PAUSED
        );

        console.log(
            "[CASE 3] isActive false while paused:",
            runtime.isActive === false
        );

        runtime.resume();

        console.log(
            "[CASE 3] lifecycleState after resume:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.STARTED
        );

        console.log(
            "[CASE 3] isActive true after resume:",
            runtime.isActive === true
        );
    }

    /* =========================
     * CASE 4: Invalid: CREATED → Pause
     *   throws LifecycleError
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        let error = null;

        try {
            runtime.pause();
        }
        catch (e) {
            error = e;
        }

        console.log(
            "[CASE 4] pause on CREATED throws:",
            error instanceof LifecycleError
        );

        console.log(
            "[CASE 4] lifecycleState still CREATED:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.CREATED
        );
    }

    /* =========================
     * CASE 5: Destroy
     *   STARTED → DESTROYED
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        runtime.start();
        runtime.destroy();

        console.log(
            "[CASE 5] lifecycleState after destroy:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.DESTROYED
        );

        console.log(
            "[CASE 5] isActive false after destroy:",
            runtime.isActive === false
        );
    }

    /* =========================
     * CASE 6: Destroy is idempotent
     *   three destroys → no error
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        runtime.start();
        runtime.destroy();
        runtime.destroy();
        runtime.destroy();

        console.log(
            "[CASE 6] idempotent destroy ok:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.DESTROYED
        );
    }

    /* =========================
     * CASE 7: Destroy clears router
     *   router packet count === 0
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const router =
            new InformationRouter();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT,
                router
            );

        const packet =
            new InformationPacket({
                id: "test_packet",
                audience:
                    InformationAudience
                        .ALL_PLAYERS,
                scope:
                    InformationScope.GLOBAL,
                payload: { msg: "hello" }
            });

        router.route(packet);

        console.log(
            "[CASE 7] packets before destroy:",
            router.getAllPackets().length
                === 1
        );

        runtime.start();
        runtime.destroy();

        console.log(
            "[CASE 7] packets after destroy:",
            router.getAllPackets().length
                === 0
        );

        console.log(
            "[CASE 7] lifecycleState after destroy:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.DESTROYED
        );
    }

    /* =========================
     * CASE 8: Complete from STARTED
     *   STARTED → COMPLETED
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        runtime.start();
        runtime.complete();

        console.log(
            "[CASE 8] complete from STARTED:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.COMPLETED
        );

        console.log(
            "[CASE 8] isActive false after complete:",
            runtime.isActive === false
        );
    }

    /* =========================
     * CASE 9: Complete from PAUSED
     *   PAUSED → COMPLETED
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        runtime.start();
        runtime.pause();
        runtime.complete();

        console.log(
            "[CASE 9] complete from PAUSED:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.COMPLETED
        );
    }

    /* =========================
     * CASE 10: Invalid: Complete from CREATED
     *   throws LifecycleError
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        let error = null;

        try {
            runtime.complete();
        }
        catch (e) {
            error = e;
        }

        console.log(
            "[CASE 10] complete on CREATED throws:",
            error instanceof LifecycleError
        );

        console.log(
            "[CASE 10] lifecycleState still CREATED:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.CREATED
        );
    }

    /* =========================
     * CASE 11: Complete from DESTROYED
     *   throws LifecycleError
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        runtime.start();
        runtime.destroy();

        let error = null;

        try {
            runtime.complete();
        }
        catch (e) {
            error = e;
        }

        console.log(
            "[CASE 11] complete on DESTROYED throws:",
            error instanceof LifecycleError
        );
    }

    /* =========================
     * CASE 11b: Complete already COMPLETED
     *   no-op
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        runtime.start();
        runtime.complete();
        runtime.complete();

        console.log(
            "[CASE 11b] complete on COMPLETED no-op:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.COMPLETED
        );
    }

    /* =========================
     * CASE 12: Restore COMPLETED
     *   save → load → lifecycleState === "completed"
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        runtime.start();
        runtime.state.set("progress", 100);
        runtime.complete();

        const snapshot =
            runtime.toSnapshot();

        console.log(
            "[CASE 12] snapshot has lifecycleState:",
            snapshot.lifecycleState
                === ScenarioLifecycleState.COMPLETED
        );

        console.log(
            "[CASE 12] snapshot has no active field:",
            snapshot.active === undefined
        );

        const restored =
            ScenarioRuntimeFactory.create(
                new TestLifecycleScenario(),
                MOCK_CONTEXT
            );

        restored.restoreFromSnapshot(snapshot);

        console.log(
            "[CASE 12] restore COMPLETED:",
            restored.getLifecycleState()
                === ScenarioLifecycleState.COMPLETED
        );

        console.log(
            "[CASE 12] state restored:",
            restored.state.get("progress")
                === 100
        );
    }

    /* =========================
     * CASE 13: Restore DESTROYED
     *   save → load → lifecycleState === "destroyed"
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        runtime.start();
        runtime.destroy();

        const snapshot =
            runtime.toSnapshot();

        console.log(
            "[CASE 13] snapshot lifecycleState:",
            snapshot.lifecycleState
                === ScenarioLifecycleState.DESTROYED
        );

        const restored =
            ScenarioRuntimeFactory.create(
                new TestLifecycleScenario(),
                MOCK_CONTEXT
            );

        restored.restoreFromSnapshot(snapshot);

        console.log(
            "[CASE 13] restore DESTROYED:",
            restored.getLifecycleState()
                === ScenarioLifecycleState.DESTROYED
        );
    }

    /* =========================
     * CASE 14: Backward compat restore
     *   old snapshot with "active:true" resumes as STARTED
     * ========================= */

    {
        const oldSnapshot = {
            scenarioId: "lifecycleTest",
            active: true,
            state: { foo: "bar" },
            information: { packets: [] }
        };

        const restored =
            ScenarioRuntimeFactory.create(
                new TestLifecycleScenario(),
                MOCK_CONTEXT
            );

        restored.restoreFromSnapshot(oldSnapshot);

        console.log(
            "[CASE 14] backward compat active:true:",
            restored.getLifecycleState()
                === ScenarioLifecycleState.STARTED
        );

        console.log(
            "[CASE 14] backward compat state:",
            restored.state.get("foo")
                === "bar"
        );
    }

    /* =========================
     * CASE 15: Backward compat restore
     *   old snapshot with "active:false" resumes as CREATED
     * ========================= */

    {
        const oldSnapshot = {
            scenarioId: "lifecycleTest",
            active: false,
            state: {},
            information: { packets: [] }
        };

        const restored =
            ScenarioRuntimeFactory.create(
                new TestLifecycleScenario(),
                MOCK_CONTEXT
            );

        restored.restoreFromSnapshot(oldSnapshot);

        console.log(
            "[CASE 15] backward compat active:false:",
            restored.getLifecycleState()
                === ScenarioLifecycleState.CREATED
        );
    }

    /* =========================
     * CASE 16: Complete before SCENARIO_COMPLETED emit
     *   simulate controller flow
     * ========================= */

    {
        const scenario =
            new TestLifecycleScenario();

        const runtime =
            ScenarioRuntimeFactory.create(
                scenario,
                MOCK_CONTEXT
            );

        runtime.start();

        let capturedState = null;
        const originalComplete =
            runtime.complete.bind(runtime);

        const patchedComplete = () => {
            capturedState =
                runtime.getLifecycleState();
            originalComplete();
        };

        runtime.complete = patchedComplete;

        runtime.complete();

        console.log(
            "[CASE 16] complete before event:",
            capturedState
                === ScenarioLifecycleState.STARTED
        );

        console.log(
            "[CASE 16] after complete:",
            runtime.getLifecycleState()
                === ScenarioLifecycleState.COMPLETED
        );

        /* Restore original */
        runtime.complete = originalComplete;
    }

    console.log(
        "===== Scenario Lifecycle Test Complete ====="
    );

}
