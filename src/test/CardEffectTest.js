import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { CharacterFactory }
    from "../model/CharacterFactory.js";

import { PlayerManager }
    from "../model/PlayerManager.js";

import { GameStateManager }
    from "../state/GameStateManager.js";

import { CardEffectController }
    from "../controller/CardEffectController.js";

export function runCardEffectTest() {

    console.log(
        "===== Card Effect Test ====="
    );

    /* =========================
     * [CASE 1] Gain Might
     * ========================= */

    EventBus.clear();

    const pm1 =
        new PlayerManager();

    const p1 =
        CharacterFactory.create(
            "brandon"
        );

    pm1.addPlayer(p1);

    const ctrl1 =
        new CardEffectController(
            pm1,
            GameStateManager
        );

    const mightBefore =
        p1.stats.might;

    EventBus.emit(
        EventTypes.CARD_DRAWN,
        {
            playerId: p1.id,
            card: {
                id: "test_might",
                effect: "modifyStat",
                stat: "might",
                amount: 1
            },
            roomId: "room_1"
        }
    );

    console.log(
        "[CASE 1] Gain Might:",
        p1.stats.might
            === mightBefore + 1
    );

    ctrl1.destroy();

    /* =========================
     * [CASE 2] Lose Sanity
     * ========================= */

    EventBus.clear();

    const pm2 =
        new PlayerManager();

    const p2 =
        CharacterFactory.create(
            "brandon"
        );

    pm2.addPlayer(p2);

    const ctrl2 =
        new CardEffectController(
            pm2,
            GameStateManager
        );

    const sanityBefore =
        p2.stats.sanity;

    EventBus.emit(
        EventTypes.CARD_DRAWN,
        {
            playerId: p2.id,
            card: {
                id: "test_sanity",
                effect: "modifyStat",
                stat: "sanity",
                amount: -1
            },
            roomId: "room_2"
        }
    );

    console.log(
        "[CASE 2] Lose Sanity:",
        p2.stats.sanity
            === sanityBefore - 1
    );

    ctrl2.destroy();

    /* =========================
     * [CASE 3A] Null Effect
     * ========================= */

    EventBus.clear();

    const pm3a =
        new PlayerManager();

    const p3a =
        CharacterFactory.create(
            "brandon"
        );

    pm3a.addPlayer(p3a);

    const ctrl3a =
        new CardEffectController(
            pm3a,
            GameStateManager
        );

    const sanity3a =
        p3a.stats.sanity;

    EventBus.emit(
        EventTypes.CARD_DRAWN,
        {
            playerId: p3a.id,
            card: {
                id: "test_null",
                effect: null
            },
            roomId: "room_3a"
        }
    );

    console.log(
        "[CASE 3A] Null Effect:",
        p3a.stats.sanity
            === sanity3a
    );

    ctrl3a.destroy();

    /* =========================
     * [CASE 3B] Invalid Effect
     * ========================= */

    EventBus.clear();

    const pm3b =
        new PlayerManager();

    const p3b =
        CharacterFactory.create(
            "brandon"
        );

    pm3b.addPlayer(p3b);

    const ctrl3b =
        new CardEffectController(
            pm3b,
            GameStateManager
        );

    const sanity3b =
        p3b.stats.sanity;

    let crashed = false;

    try {

        EventBus.emit(
            EventTypes.CARD_DRAWN,
            {
                playerId: p3b.id,
                card: {
                    id: "test_invalid",
                    effect: "foobar",
                    stat: "sanity",
                    amount: -1
                },
                roomId: "room_3b"
            }
        );

    }
    catch (e) {

        crashed = true;

    }

    console.log(
        "[CASE 3B] Invalid Effect:",
        !crashed
        && p3b.stats.sanity
            === sanity3b
    );

    ctrl3b.destroy();

    /* =========================
     * [CASE 4] CARD_EFFECT_REQUESTED
     * ========================= */

    EventBus.clear();

    const pm4 =
        new PlayerManager();

    const p4 =
        CharacterFactory.create(
            "brandon"
        );

    pm4.addPlayer(p4);

    const ctrl4 =
        new CardEffectController(
            pm4,
            GameStateManager
        );

    const requested = [];

    const onRequested =
        payload => {

            requested.push(payload);

        };

    EventBus.on(
        EventTypes.CARD_EFFECT_REQUESTED,
        onRequested
    );

    EventBus.emit(
        EventTypes.CARD_DRAWN,
        {
            playerId: p4.id,
            card: {
                id: "test_req",
                effect: "modifyStat",
                stat: "knowledge",
                amount: 1
            },
            roomId: "room_4"
        }
    );

    EventBus.off(
        EventTypes.CARD_EFFECT_REQUESTED,
        onRequested
    );

    console.log(
        "[CASE 4] CARD_EFFECT_REQUESTED:",
        requested.length === 1
        && requested[0].playerId
            === p4.id
        && requested[0].effect
            === "modifyStat"
        && requested[0].stat
            === "knowledge"
        && requested[0].amount
            === 1
    );

    ctrl4.destroy();

    /* =========================
     * [CASE 5] CARD_EFFECT_RESOLVED
     * ========================= */

    EventBus.clear();

    const pm5 =
        new PlayerManager();

    const p5 =
        CharacterFactory.create(
            "brandon"
        );

    pm5.addPlayer(p5);

    const ctrl5 =
        new CardEffectController(
            pm5,
            GameStateManager
        );

    const resolved = [];

    const onResolved =
        payload => {

            resolved.push(payload);

        };

    EventBus.on(
        EventTypes.CARD_EFFECT_RESOLVED,
        onResolved
    );

    EventBus.emit(
        EventTypes.CARD_DRAWN,
        {
            playerId: p5.id,
            card: {
                id: "test_res",
                effect: "modifyStat",
                stat: "might",
                amount: 1
            },
            roomId: "room_5"
        }
    );

    EventBus.off(
        EventTypes.CARD_EFFECT_RESOLVED,
        onResolved
    );

    console.log(
        "[CASE 5] CARD_EFFECT_RESOLVED:",
        resolved.length === 1
        && resolved[0].playerId
            === p5.id
        && resolved[0].effect
            === "modifyStat"
        && resolved[0].stat
            === "might"
        && resolved[0].amount
            === 1
    );

    ctrl5.destroy();

    /* =========================
     * [CASE 6] Multiple Effects
     * ========================= */

    EventBus.clear();

    const pm6 =
        new PlayerManager();

    const p6 =
        CharacterFactory.create(
            "brandon"
        );

    pm6.addPlayer(p6);

    const ctrl6 =
        new CardEffectController(
            pm6,
            GameStateManager
        );

    const might6 =
        p6.stats.might;

    const sanity6 =
        p6.stats.sanity;

    EventBus.emit(
        EventTypes.CARD_DRAWN,
        {
            playerId: p6.id,
            card: {
                id: "multi_1",
                effect: "modifyStat",
                stat: "might",
                amount: 2
            },
            roomId: "room_6a"
        }
    );

    EventBus.emit(
        EventTypes.CARD_DRAWN,
        {
            playerId: p6.id,
            card: {
                id: "multi_2",
                effect: "modifyStat",
                stat: "sanity",
                amount: -1
            },
            roomId: "room_6b"
        }
    );

    console.log(
        "[CASE 6] Multiple Effects:",
        p6.stats.might
            === might6 + 2
        && p6.stats.sanity
            === sanity6 - 1
    );

    ctrl6.destroy();

    /* =========================
     * Final Cleanup
     * ========================= */

    EventBus.clear();

    console.log(
        "===== Card Effect Test Complete ====="
    );

}
