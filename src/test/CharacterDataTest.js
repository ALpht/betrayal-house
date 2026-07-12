import { CharacterDefinitions }
    from "../data/CharacterDefinitions.js";

import { CharacterFactory }
    from "../model/CharacterFactory.js";

export function runCharacterDataTest() {

    console.log(
        "\n===== Character Data Test ====="
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
            Array.isArray(CharacterDefinitions),
            "Case 1: CharacterDefinitions is an array"
        );

        assert(
            CharacterDefinitions.length > 0,
            "Case 1b: CharacterDefinitions is not empty"
        );
    }

    /* =========================
     * CASE 2 — All Have ID
     * ========================= */
    {
        const allHaveId =
            CharacterDefinitions.every(
                c =>
                    typeof c.id === "string"
                    && c.id.length > 0
            );

        assert(
            allHaveId,
            "Case 2: All characters have a string id"
        );
    }

    /* =========================
     * CASE 3 — All Have Name
     * ========================= */
    {
        const allHaveName =
            CharacterDefinitions.every(
                c =>
                    typeof c.name === "string"
                    && c.name.length > 0
            );

        assert(
            allHaveName,
            "Case 3: All characters have a string name"
        );
    }

    /* =========================
     * CASE 4 — All Have Color
     * ========================= */
    {
        const allHaveColor =
            CharacterDefinitions.every(
                c =>
                    typeof c.color === "string"
                    && c.color.startsWith("#")
            );

        assert(
            allHaveColor,
            "Case 4: All characters have a hex color"
        );
    }

    /* =========================
     * CASE 5 — All Have Stats Object
     * ========================= */
    {
        const allHaveStats =
            CharacterDefinitions.every(
                c =>
                    typeof c.stats === "object"
                    && c.stats !== null
            );

        assert(
            allHaveStats,
            "Case 5: All characters have a stats object"
        );
    }

    /* =========================
     * CASE 6 — Stats Have Required Fields
     * ========================= */
    {
        const requiredStats =
            ["speed", "might", "sanity", "knowledge"];

        const allHaveRequiredStats =
            CharacterDefinitions.every(
                c =>
                    requiredStats.every(
                        s =>
                            typeof c.stats[s] === "number"
                    )
            );

        assert(
            allHaveRequiredStats,
            "Case 6: All stats have speed, might, sanity, knowledge"
        );
    }

    /* =========================
     * CASE 7 — No Duplicate IDs
     * ========================= */
    {
        const ids =
            CharacterDefinitions.map(c => c.id);

        const uniqueIds =
            new Set(ids);

        assert(
            ids.length === uniqueIds.size,
            "Case 7: No duplicate character IDs"
        );
    }

    /* =========================
     * CASE 8 — CharacterFactory Creates Valid Player
     * ========================= */
    {
        let factoryErrors = 0;

        for (
            const def
            of CharacterDefinitions
        ) {
            try {
                const player =
                    CharacterFactory.create(def.id);

                const hasId =
                    typeof player.id === "string"
                    && player.id.length > 0;

                const hasStats =
                    typeof player.stats.speed === "number"
                    && typeof player.stats.might === "number"
                    && typeof player.stats.sanity === "number"
                    && typeof player.stats.knowledge === "number";

                if (!hasId || !hasStats) {
                    factoryErrors++;
                }
            } catch {
                factoryErrors++;
            }
        }

        assert(
            factoryErrors === 0,
            `Case 8: All characters create valid Players (${factoryErrors} errors)`
        );
    }

    const elapsed = Date.now() - totalStart;

    console.log(
        `\n===== Character Data Test: `
        + `${passed} passed, ${failed} failed `
        + `(${elapsed}ms) =====\n`
    );

}
