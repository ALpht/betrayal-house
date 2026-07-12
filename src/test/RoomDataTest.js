import { RoomDefinitions }
    from "../data/RoomDefinitions.js";

import { TileDeck }
    from "../model/TileDeck.js";

const VALID_TRIGGER_TYPES =
    ["event", "item", "omen", null];

const VALID_EXITS =
    ["north", "east", "south", "west"];

export function runRoomDataTest() {

    console.log(
        "\n===== Room Data Test ====="
    );

    let passed = 0;
    let failed = 0;

    function assert(ok, label) {
        if (ok) {
            console.log(`[PASS] ${label}`);
            passed++;
        } else {
            console.log(`[FAIL] ${label}`);
            failed++;
        }
    }

    const totalStart = Date.now();

    /* =========================
     * CASE 1 — Definitions Exist
     * ========================= */
    {
        assert(
            Array.isArray(RoomDefinitions),
            "Case 1a: RoomDefinitions is an array"
        );

        assert(
            RoomDefinitions.length > 0,
            "Case 1b: RoomDefinitions is not empty"
        );
    }

    /* =========================
     * CASE 2 — All Have ID
     * ========================= */
    {
        const allHaveId =
            RoomDefinitions.every(
                r =>
                    typeof r.id === "number"
                    && r.id > 0
            );

        assert(
            allHaveId,
            "Case 2: All rooms have a numeric id"
        );
    }

    /* =========================
     * CASE 3 — All Have Name
     * ========================= */
    {
        const allHaveName =
            RoomDefinitions.every(
                r =>
                    typeof r.name === "string"
                    && r.name.length > 0
            );

        assert(
            allHaveName,
            "Case 3: All rooms have a string name"
        );
    }

    /* =========================
     * CASE 4 — All Have Exits Object
     * ========================= */
    {
        const allHaveExits =
            RoomDefinitions.every(
                r =>
                    typeof r.exits === "object"
                    && r.exits !== null
            );

        assert(
            allHaveExits,
            "Case 4: All rooms have an exits object"
        );
    }

    /* =========================
     * CASE 5 — Exits Have Valid Boolean Values
     * ========================= */
    {
        const allExitsValid =
            RoomDefinitions.every(
                r =>
                    VALID_EXITS.every(
                        e =>
                            typeof r.exits[e]
                            === "boolean"
                    )
            );

        assert(
            allExitsValid,
            "Case 5: All exits are boolean values"
        );
    }

    /* =========================
     * CASE 6 — No Duplicate IDs
     * ========================= */
    {
        const ids =
            RoomDefinitions.map(r => r.id);

        const uniqueIds =
            new Set(ids);

        assert(
            ids.length === uniqueIds.size,
            "Case 6: No duplicate room IDs"
        );
    }

    /* =========================
     * CASE 7 — TriggerType Valid
     * ========================= */
    {
        const allTriggerValid =
            RoomDefinitions.every(
                r =>
                    VALID_TRIGGER_TYPES
                        .includes(r.triggerType)
            );

        assert(
            allTriggerValid,
            "Case 7: All triggerTypes are valid"
        );
    }

    /* =========================
     * CASE 8 — TileDeck Loadable
     * ========================= */
    {
        let deckLoadable = false;

        try {
            const deck =
                new TileDeck(RoomDefinitions);

            deckLoadable =
                deck.count()
                === RoomDefinitions.length;
        } catch {
            deckLoadable = false;
        }

        assert(
            deckLoadable,
            "Case 8: RoomDefinitions loadable into TileDeck"
        );
    }

    const elapsed = Date.now() - totalStart;

    console.log(
        `\n===== Room Data Test: `
        + `${passed} passed, ${failed} failed `
        + `(${elapsed}ms) =====\n`
    );

}
