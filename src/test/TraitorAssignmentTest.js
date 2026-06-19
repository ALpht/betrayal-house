import { EventBus }
    from "../core/EventBus.js";

import { EventTypes }
    from "../core/EventTypes.js";

import { PlayerManager }
    from "../model/PlayerManager.js";

import { CharacterFactory }
    from "../model/CharacterFactory.js";

import { TraitorAssignmentRegistry }
    from "../traitor/TraitorAssignmentRegistry.js";

import { RandomTraitorRule }
    from "../traitor/RandomTraitorRule.js";

import { TraitorAssignmentController }
    from "../controller/TraitorAssignmentController.js";

class MockGameStateManager {

    constructor() {
        this.#traitorPlayerId = null;
    }

    setTraitorPlayerId(id) {
        this.#traitorPlayerId = id;
    }

    getTraitorPlayerId() {
        return this.#traitorPlayerId;
    }

    #traitorPlayerId;

}

function createPlayers(count) {

    const pm =
        new PlayerManager();

    for (let i = 0;
        i < count; i++
    ) {

    const player =
        CharacterFactory.create(
            "brandon"
        );

        pm.addPlayer(player);

    }

    return pm;

}

export function runTraitorAssignmentTest() {

    console.log(
        "===== Traitor Assignment Test ====="
    );

    /* =========================
     * [CASE 1] SCENARIO_STARTED produces TRAITOR_ASSIGNED
     * ========================= */
    EventBus.clear();

    const pm1 =
        createPlayers(3);

    const gsm1 =
        new MockGameStateManager();

    const ctrl1 =
        new TraitorAssignmentController(
            TraitorAssignmentRegistry,
            pm1,
            gsm1
        );

    let assignedPayload = null;

    EventBus.on(
        EventTypes.TRAITOR_ASSIGNED,
        (p) => { assignedPayload = p; }
    );

    EventBus.emit(
        EventTypes.SCENARIO_STARTED,
        {
            scenarioId: "testScenario",
            traitorRule: "random"
        }
    );

    console.log(
        "[CASE 1] TRAITOR_ASSIGNED emitted:",
        assignedPayload !== null
    );

    ctrl1.destroy();

    /* =========================
     * [CASE 2] traitorPlayerId exists and is non-empty
     * ========================= */
    EventBus.clear();

    const pm2 =
        createPlayers(3);

    const gsm2 =
        new MockGameStateManager();

    const ctrl2 =
        new TraitorAssignmentController(
            TraitorAssignmentRegistry,
            pm2,
            gsm2
        );

    assignedPayload = null;

    EventBus.on(
        EventTypes.TRAITOR_ASSIGNED,
        (p) => { assignedPayload = p; }
    );

    EventBus.emit(
        EventTypes.SCENARIO_STARTED,
        {
            scenarioId: "testScenario",
            traitorRule: "random"
        }
    );

    console.log(
        "[CASE 2] traitorPlayerId exists:",
        assignedPayload !== null
            && typeof assignedPayload
                .traitorPlayerId === "string"
            && assignedPayload.traitorPlayerId
                .length > 0
    );

    ctrl2.destroy();

    /* =========================
     * [CASE 3] traitorPlayerId comes from player list
     * ========================= */
    EventBus.clear();

    const pm3 =
        createPlayers(3);

    const gsm3 =
        new MockGameStateManager();

    const ctrl3 =
        new TraitorAssignmentController(
            TraitorAssignmentRegistry,
            pm3,
            gsm3
        );

    assignedPayload = null;

    EventBus.on(
        EventTypes.TRAITOR_ASSIGNED,
        (p) => { assignedPayload = p; }
    );

    EventBus.emit(
        EventTypes.SCENARIO_STARTED,
        {
            scenarioId: "testScenario",
            traitorRule: "random"
        }
    );

    const playerIds =
        pm3.getAllPlayers()
            .map(p => p.id);

    console.log(
        "[CASE 3] traitorPlayerId in player list:",
        assignedPayload !== null
            && playerIds.includes(
                assignedPayload
                    .traitorPlayerId
            )
    );

    ctrl3.destroy();

    /* =========================
     * [CASE 4] Single player still works
     * ========================= */
    EventBus.clear();

    const pm4 =
        createPlayers(1);

    const gsm4 =
        new MockGameStateManager();

    const ctrl4 =
        new TraitorAssignmentController(
            TraitorAssignmentRegistry,
            pm4,
            gsm4
        );

    assignedPayload = null;

    EventBus.on(
        EventTypes.TRAITOR_ASSIGNED,
        (p) => { assignedPayload = p; }
    );

    EventBus.emit(
        EventTypes.SCENARIO_STARTED,
        {
            scenarioId: "testScenario",
            traitorRule: "random"
        }
    );

    console.log(
        "[CASE 4] Single player works:",
        assignedPayload !== null
            && typeof assignedPayload
                .traitorPlayerId === "string"
    );

    ctrl4.destroy();

    /* =========================
     * [CASE 5] Registry creates rule correctly
     * ========================= */

    const rule =
        TraitorAssignmentRegistry
            .random();

    console.log(
        "[CASE 5] Registry creates RandomTraitorRule:",
        rule
            instanceof RandomTraitorRule
    );

    /* =========================
     * [CASE 6] GameStateManager stores traitorPlayerId
     * ========================= */
    EventBus.clear();

    const pm6 =
        createPlayers(3);

    const gsm6 =
        new MockGameStateManager();

    const ctrl6 =
        new TraitorAssignmentController(
            TraitorAssignmentRegistry,
            pm6,
            gsm6
        );

    assignedPayload = null;

    EventBus.on(
        EventTypes.TRAITOR_ASSIGNED,
        (p) => { assignedPayload = p; }
    );

    EventBus.emit(
        EventTypes.SCENARIO_STARTED,
        {
            scenarioId: "testScenario",
            traitorRule: "random"
        }
    );

    console.log(
        "[CASE 6] GameStateManager stores traitorPlayerId:",
        assignedPayload !== null
            && gsm6.getTraitorPlayerId()
                === assignedPayload
                    .traitorPlayerId
    );

    ctrl6.destroy();

    /* =========================
     * [CASE 7] Unknown traitorRule silently ignored
     * ========================= */
    EventBus.clear();

    const pm7 =
        createPlayers(3);

    const gsm7 =
        new MockGameStateManager();

    const ctrl7 =
        new TraitorAssignmentController(
            TraitorAssignmentRegistry,
            pm7,
            gsm7
        );

    assignedPayload = null;

    EventBus.on(
        EventTypes.TRAITOR_ASSIGNED,
        (p) => { assignedPayload = p; }
    );

    EventBus.emit(
        EventTypes.SCENARIO_STARTED,
        {
            scenarioId: "testScenario",
            traitorRule: "unknownRule"
        }
    );

    console.log(
        "[CASE 7] Unknown rule silently ignored:",
        assignedPayload === null
    );

    ctrl7.destroy();

}

