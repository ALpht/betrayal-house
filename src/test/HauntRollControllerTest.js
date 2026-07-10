import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { StandardHauntRule }
    from "../haunt/StandardHauntRule.js";

import { HauntDice }
    from "../model/HauntDice.js";

import { HauntRollController }
    from "../controller/HauntRollController.js";

export function runHauntRollControllerTest() {

    console.log(
        "===== Haunt Roll Controller Test ====="
    );

    /* =========================
     * [CASE 1] OMEN_DRAWN → HAUNT_ROLL_REQUESTED
     * ========================= */

    EventBus.clear();

    const rule1 =
        new StandardHauntRule();

    const ctrl1 =
        new HauntRollController(rule1);

    let requestedPayload = null;

    EventBus.on(
        EventTypes.HAUNT_ROLL_REQUESTED,
        (p) => { requestedPayload = p; }
    );

    EventBus.emit(
        EventTypes.OMEN_DRAWN,
        {
            omenCount: 3,
            card: { id: "omen_test", type: "omen" },
            playerId: "p1",
            roomId: "r1"
        }
    );

    console.log(
        "[CASE 1] HAUNT_ROLL_REQUESTED emitted:",
        requestedPayload !== null
    );

    console.log(
        "[CASE 1] Payload omenCount:",
        requestedPayload
            && requestedPayload.omenCount === 3
    );

    console.log(
        "[CASE 1] Payload card:",
        requestedPayload
            && requestedPayload.card.id === "omen_test"
    );

    console.log(
        "[CASE 1] Payload playerId:",
        requestedPayload
            && requestedPayload.playerId === "p1"
    );

    console.log(
        "[CASE 1] Payload roomId:",
        requestedPayload
            && requestedPayload.roomId === "r1"
    );

    ctrl1.destroy();

    /* =========================
     * [CASE 2] OMEN_DRAWN → HAUNT_ROLL_COMPLETED
     * ========================= */

    EventBus.clear();

    const rule2 =
        new StandardHauntRule();

    const ctrl2 =
        new HauntRollController(rule2);

    let completedPayload = null;

    EventBus.on(
        EventTypes.HAUNT_ROLL_COMPLETED,
        (p) => { completedPayload = p; }
    );

    EventBus.emit(
        EventTypes.OMEN_DRAWN,
        {
            omenCount: 3,
            card: { id: "omen_test", type: "omen" },
            playerId: "p1",
            roomId: "r1"
        }
    );

    console.log(
        "[CASE 2] HAUNT_ROLL_COMPLETED emitted:",
        completedPayload !== null
    );

    console.log(
        "[CASE 2] Payload has roll:",
        completedPayload
            && typeof completedPayload.roll === "number"
    );

    console.log(
        "[CASE 2] Payload omenCount:",
        completedPayload
            && completedPayload.omenCount === 3
    );

    console.log(
        "[CASE 2] Payload triggerThreshold:",
        completedPayload
            && completedPayload.triggerThreshold === 3
    );

    console.log(
        "[CASE 2] Payload has hauntTriggered:",
        completedPayload
            && typeof completedPayload.hauntTriggered
                === "boolean"
    );

    ctrl2.destroy();

    /* =========================
     * [CASE 3] HauntDice controlled RNG
     * ========================= */

    const rollMin =
        HauntDice.rollSixDice(() => 0);

    console.log(
        "[CASE 3] RNG=0 → roll 0:",
        rollMin === 0
    );

    const rollMax =
        HauntDice.rollSixDice(() => 0.999);

    console.log(
        "[CASE 3] RNG=0.999 → roll 12:",
        rollMax === 12
    );

    /* =========================
     * [CASE 4] StandardHauntRule
     * ========================= */

    const rule =
        new StandardHauntRule();

    console.log(
        "[CASE 4] 2 < 3 → true:",
        rule.shouldTrigger(2, 3) === true
    );

    console.log(
        "[CASE 4] 5 < 3 → false:",
        rule.shouldTrigger(5, 3) === false
    );

    console.log(
        "[CASE 4] 3 < 3 → false:",
        rule.shouldTrigger(3, 3) === false
    );

}
