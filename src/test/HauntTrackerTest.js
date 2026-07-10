import { HauntTracker }
    from "../model/HauntTracker.js";

import { HauntTrackerController }
    from "../controller/HauntTrackerController.js";

import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

export function runHauntTrackerTest() {

    console.log(
        "===== Haunt Tracker Test ====="
    );

    /* =========================
     * [CASE 1] Track one omen
     * ========================= */

    const t1 = new HauntTracker();

    t1.trackOmen(
        { id: "omen_1", type: "omen" },
        "p1",
        "r1"
    );

    console.log(
        "[CASE 1] Count after 1 omen:",
        t1.getOmenCount() === 1
    );

    console.log(
        "[CASE 1] Records length:",
        t1.getRecords().length === 1
    );

    /* =========================
     * [CASE 2] Track multiple omens
     * ========================= */

    t1.trackOmen(
        { id: "omen_2", type: "omen" },
        "p1",
        "r2"
    );

    t1.trackOmen(
        { id: "omen_3", type: "omen" },
        "p2",
        "r3"
    );

    console.log(
        "[CASE 2] Count after 3 omens:",
        t1.getOmenCount() === 3
    );

    console.log(
        "[CASE 2] Records length:",
        t1.getRecords().length === 3
    );

    /* =========================
     * [CASE 3] Record fields
     * ========================= */

    const rec = t1.getRecords()[0];

    console.log(
        "[CASE 3] Record has card:",
        rec.card.id === "omen_1"
    );

    console.log(
        "[CASE 3] Record has playerId:",
        rec.playerId === "p1"
    );

    console.log(
        "[CASE 3] Record has roomId:",
        rec.roomId === "r1"
    );

    console.log(
        "[CASE 3] Record has timestamp:",
        typeof rec.timestamp === "number"
    );

    console.log(
        "[CASE 3] Record has omenIndex:",
        rec.omenIndex === 1
    );

    /* =========================
     * [CASE 4] Reset
     * ========================= */

    t1.reset();

    console.log(
        "[CASE 4] Count after reset:",
        t1.getOmenCount() === 0
    );

    console.log(
        "[CASE 4] Records after reset:",
        t1.getRecords().length === 0
    );

    /* =========================
     * [CASE 5] Controller emits OMEN_DRAWN
     * ========================= */

    EventBus.clear();

    const t5 = new HauntTracker();

    const ctrl5 =
        new HauntTrackerController(t5);

    let omenDrawnPayload = null;

    EventBus.on(
        EventTypes.OMEN_DRAWN,
        (p) => { omenDrawnPayload = p; }
    );

    EventBus.emit(
        EventTypes.CARD_DRAWN,
        {
            card: { id: "omen_x", type: "omen" },
            playerId: "p1",
            roomId: "r1"
        }
    );

    console.log(
        "[CASE 5] OMEN_DRAWN emitted:",
        omenDrawnPayload !== null
    );

    console.log(
        "[CASE 5] omenCount:",
        omenDrawnPayload
            && omenDrawnPayload.omenCount === 1
    );

    console.log(
        "[CASE 5] Tracker count:",
        t5.getOmenCount() === 1
    );

    ctrl5.destroy();

    /* =========================
     * [CASE 6] Non-omen card ignored
     * ========================= */

    EventBus.clear();

    const t6 = new HauntTracker();

    const ctrl6 =
        new HauntTrackerController(t6);

    let omenDrawnCount = 0;

    EventBus.on(
        EventTypes.OMEN_DRAWN,
        () => { omenDrawnCount++; }
    );

    EventBus.emit(
        EventTypes.CARD_DRAWN,
        {
            card: { id: "event_1", type: "event" },
            playerId: "p1",
            roomId: "r1"
        }
    );

    EventBus.emit(
        EventTypes.CARD_DRAWN,
        {
            card: { id: "item_1", type: "item" },
            playerId: "p2",
            roomId: "r2"
        }
    );

    console.log(
        "[CASE 6] OMEN_DRAWN not emitted:",
        omenDrawnCount === 0
    );

    console.log(
        "[CASE 6] Tracker count 0:",
        t6.getOmenCount() === 0
    );

    ctrl6.destroy();

}
