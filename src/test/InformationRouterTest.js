import { InformationRouter }
    from "../scenario/information/InformationRouter.js";

import { InformationPacket }
    from "../scenario/information/InformationPacket.js";

import { InformationAudience }
    from "../scenario/information/InformationAudience.js";

import { InformationScope }
    from "../scenario/information/InformationScope.js";

import { isVisibleTo, resolveAudience }
    from "../scenario/information/InformationVisibility.js";

export function runInformationRouterTest() {

    console.log(
        "===== Information Router Test ====="
    );

    const HERO_ID = "hero-uuid-001";
    const TRAITOR_ID = "traitor-uuid-002";

    /* =========================
     * [CASE 1] ALL_PLAYERS
     * ========================= */

    const router1 = new InformationRouter();

    router1.route(
        new InformationPacket({
            id: "public-info",
            audience: InformationAudience.ALL_PLAYERS,
            scope: InformationScope.SCENARIO,
            payload: { message: "Haunt started" }
        })
    );

    const heroVisible1 = router1
        .getVisiblePackets(HERO_ID, TRAITOR_ID);

    const traitorVisible1 = router1
        .getVisiblePackets(TRAITOR_ID, HERO_ID);

    console.log(
        "[CASE 1] ALL_PLAYERS visible to hero:",
        heroVisible1.length === 1
    );

    console.log(
        "[CASE 1] ALL_PLAYERS visible to traitor:",
        traitorVisible1.length === 1
    );

    console.log(
        "[CASE 1] Same packet visible to both:",
        heroVisible1[0].id === traitorVisible1[0].id
    );

    /* =========================
     * [CASE 2] TRAITOR_ONLY
     * ========================= */

    const router2 = new InformationRouter();

    router2.route(
        new InformationPacket({
            id: "traitor-secret",
            audience: InformationAudience.TRAITOR_ONLY,
            payload: { objective: "Kill all heroes" }
        })
    );

    const heroVisible2 = router2
        .getVisiblePackets(HERO_ID, TRAITOR_ID);

    const traitorVisible2 = router2
        .getVisiblePackets(TRAITOR_ID, TRAITOR_ID);

    console.log(
        "[CASE 2] TRAITOR_ONLY hidden from hero:",
        heroVisible2.length === 0
    );

    console.log(
        "[CASE 2] TRAITOR_ONLY visible to traitor:",
        traitorVisible2.length === 1
    );

    console.log(
        "[CASE 2] TRAITOR_ONLY correct id:",
        traitorVisible2[0].id === "traitor-secret"
    );

    /* =========================
     * [CASE 3] HEROES_ONLY
     * ========================= */

    const router3 = new InformationRouter();

    router3.route(
        new InformationPacket({
            id: "hero-secret",
            audience: InformationAudience.HEROES_ONLY,
            payload: { objective: "Escape the house" }
        })
    );

    const heroVisible3 = router3
        .getVisiblePackets(HERO_ID, TRAITOR_ID);

    const traitorVisible3 = router3
        .getVisiblePackets(TRAITOR_ID, TRAITOR_ID);

    console.log(
        "[CASE 3] HEROES_ONLY visible to hero:",
        heroVisible3.length === 1
    );

    console.log(
        "[CASE 3] HEROES_ONLY hidden from traitor:",
        traitorVisible3.length === 0
    );

    console.log(
        "[CASE 3] HEROES_ONLY correct id:",
        heroVisible3[0].id === "hero-secret"
    );

    /* =========================
     * [CASE 4] Serialization round-trip
     * ========================= */

    const router4 = new InformationRouter();

    router4.route(
        new InformationPacket({
            id: "packet-a",
            audience: InformationAudience.ALL_PLAYERS,
            payload: { value: 42 }
        })
    );

    router4.route(
        new InformationPacket({
            id: "packet-b",
            audience: InformationAudience.TRAITOR_ONLY,
            scope: InformationScope.OBJECTIVE,
            payload: { target: "hero-1" }
        })
    );

    const serialized = router4.serialize();
    const router4b = new InformationRouter();
    router4b.deserialize(serialized);

    const allPackets = router4b.getAllPackets();

    console.log(
        "[CASE 4] Deserialized packet count:",
        allPackets.length === 2
    );

    console.log(
        "[CASE 4] Deserialized packet-a id:",
        allPackets.find(p => p.id === "packet-a")?.audience
            === InformationAudience.ALL_PLAYERS
    );

    console.log(
        "[CASE 4] Deserialized packet-b payload:",
        allPackets.find(p => p.id === "packet-b")?.payload.target
            === "hero-1"
    );

    console.log(
        "[CASE 4] Round-trip: visible packets preserved:",
        router4b.getVisiblePackets(TRAITOR_ID, TRAITOR_ID).length === 2
    );

    /* =========================
     * [CASE 5] Multiple Packets Isolation
     * ========================= */

    const router5 = new InformationRouter();

    router5.route(
        new InformationPacket({
            id: "all",
            audience: InformationAudience.ALL_PLAYERS,
            payload: { msg: "public" }
        })
    );

    router5.route(
        new InformationPacket({
            id: "traitor-only",
            audience: InformationAudience.TRAITOR_ONLY,
            payload: { msg: "secret" }
        })
    );

    router5.route(
        new InformationPacket({
            id: "hero-only",
            audience: InformationAudience.HEROES_ONLY,
            payload: { msg: "hero-msg" }
        })
    );

    const heroVisible5 = router5
        .getVisiblePackets(HERO_ID, TRAITOR_ID);

    const traitorVisible5 = router5
        .getVisiblePackets(TRAITOR_ID, TRAITOR_ID);

    console.log(
        "[CASE 5] Hero sees 2 packets (all + hero-only):",
        heroVisible5.length === 2
    );

    console.log(
        "[CASE 5] Hero sees hero-only:",
        heroVisible5.some(p => p.id === "hero-only")
    );

    console.log(
        "[CASE 5] Hero does NOT see traitor-only:",
        !heroVisible5.some(p => p.id === "traitor-only")
    );

    console.log(
        "[CASE 5] Traitor sees 2 packets (all + traitor-only):",
        traitorVisible5.length === 2
    );

    console.log(
        "[CASE 5] Traitor sees traitor-only:",
        traitorVisible5.some(p => p.id === "traitor-only")
    );

    console.log(
        "[CASE 5] Traitor does NOT see hero-only:",
        !traitorVisible5.some(p => p.id === "hero-only")
    );

    /* =========================
     * [CASE 6] Restore does not duplicate
     * ========================= */

    const router6 = new InformationRouter();

    router6.route(
        new InformationPacket({
            id: "existing",
            audience: InformationAudience.ALL_PLAYERS,
            payload: { msg: "original" }
        })
    );

    const serialized6 = router6.serialize();
    router6.deserialize(serialized6);

    console.log(
        "[CASE 6] After restore, no duplicate:",
        router6.getAllPackets().length === 1
    );

    router6.route(
        new InformationPacket({
            id: "new-after-restore",
            audience: InformationAudience.HEROES_ONLY,
            payload: { msg: "added" }
        })
    );

    console.log(
        "[CASE 6] Can add new packet after restore:",
        router6.getAllPackets().length === 2
    );

    console.log(
        "[CASE 6] Duplicate id throws error:",
        (() => {
            try {
                router6.route(
                    new InformationPacket({
                        id: "existing",
                        audience: InformationAudience.ALL_PLAYERS,
                        payload: { msg: "duplicate" }
                    })
                );
                return false;
            } catch {
                return true;
            }
        })()
    );

    /* =========================
     * [CASE 7] Scenario Isolation
     * ========================= */

    const routerA = new InformationRouter();

    routerA.route(
        new InformationPacket({
            id: "scenario-a-packet",
            audience: InformationAudience.TRAITOR_ONLY,
            payload: { data: "A" }
        })
    );

    const routerB = new InformationRouter();

    routerB.route(
        new InformationPacket({
            id: "scenario-b-packet",
            audience: InformationAudience.HEROES_ONLY,
            payload: { data: "B" }
        })
    );

    const aPackets = routerA
        .getAllPackets();

    const bPackets = routerB
        .getAllPackets();

    console.log(
        "[CASE 7] Scenario A has its own packet:",
        aPackets.length === 1
            && aPackets[0].id === "scenario-a-packet"
    );

    console.log(
        "[CASE 7] Scenario B has its own packet:",
        bPackets.length === 1
            && bPackets[0].id === "scenario-b-packet"
    );

    console.log(
        "[CASE 7] Scenario A packet NOT in Scenario B:",
        !bPackets.some(p => p.id === "scenario-a-packet")
    );

    console.log(
        "[CASE 7] Scenario B packet NOT in Scenario A:",
        !aPackets.some(p => p.id === "scenario-b-packet")
    );

    /* =========================
     * Cleanup
     * ========================= */

    console.log(
        "===== Information Router Test: DONE ====="
    );

}
