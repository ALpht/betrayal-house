import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { GameStateManager, GAME_STATE }
    from "../state/GameStateManager.js";

import { HauntManager }
    from "../controller/HauntManager.js";

export function runHauntManagerTest() {

    console.log(
        "===== Haunt Manager Test ====="
    );

    /* =========================
     * [CASE 1] Triggered → HAUNT_TRIGGERED + state change
     * ========================= */

    EventBus.clear();

    const gsmHandler =
        () => GameStateManager
            .setState(GAME_STATE.HAUNT);

    EventBus.on(
        EventTypes.HAUNT_TRIGGERED,
        gsmHandler
    );

    GameStateManager.setState(
        GAME_STATE.EXPLORATION
    );

    const mgr1 =
        new HauntManager();

    let hauntTriggeredFired = false;

    EventBus.on(
        EventTypes.HAUNT_TRIGGERED,
        () => { hauntTriggeredFired = true; }
    );

    EventBus.emit(
        EventTypes.HAUNT_ROLL_COMPLETED,
        {
            roll: 2,
            omenCount: 3,
            triggerThreshold: 3,
            hauntTriggered: true
        }
    );

    console.log(
        "[CASE 1] HAUNT_TRIGGERED emitted:",
        hauntTriggeredFired
    );

    console.log(
        "[CASE 1] GameState is HAUNT:",
        GameStateManager.getState()
            === GAME_STATE.HAUNT
    );

    mgr1.destroy();

    /* =========================
     * [CASE 2] Not triggered → no HAUNT_TRIGGERED
     * ========================= */

    EventBus.clear();

    const gsmHandler2 =
        () => GameStateManager
            .setState(GAME_STATE.HAUNT);

    EventBus.on(
        EventTypes.HAUNT_TRIGGERED,
        gsmHandler2
    );

    GameStateManager.setState(
        GAME_STATE.EXPLORATION
    );

    const mgr2 =
        new HauntManager();

    let hauntTriggeredFired2 = false;

    EventBus.on(
        EventTypes.HAUNT_TRIGGERED,
        () => { hauntTriggeredFired2 = true; }
    );

    EventBus.emit(
        EventTypes.HAUNT_ROLL_COMPLETED,
        {
            roll: 5,
            omenCount: 3,
            triggerThreshold: 3,
            hauntTriggered: false
        }
    );

    console.log(
        "[CASE 2] HAUNT_TRIGGERED not emitted:",
        !hauntTriggeredFired2
    );

    console.log(
        "[CASE 2] GameState stays EXPLORATION:",
        GameStateManager.getState()
            === GAME_STATE.EXPLORATION
    );

    mgr2.destroy();
    EventBus.off(
        EventTypes.HAUNT_TRIGGERED,
        gsmHandler2
    );

}
