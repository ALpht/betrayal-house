import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";
import { PresentationController } from "../presentation/controller/PresentationController.js";
import { CharacterPresentationQuery } from "../presentation/query/CharacterPresentationQuery.js";
import { CharacterPresentationModel } from "../presentation/model/CharacterPresentationModel.js";
import { CharacterPanel } from "../presentation/panel/CharacterPanel.js";
import { ActionAvailabilityQuery } from "../presentation/query/ActionAvailabilityQuery.js";
import { TurnPresentationQuery } from "../presentation/TurnPresentationQuery.js";

function createFakePlayer(overrides = {}) {
    return {
        id: overrides.id ?? "p1",
        character: overrides.character ?? { name: "Brandon Jaspers" },
        stats: {
            speed: overrides.speed ?? 4,
            might: overrides.might ?? 4,
            sanity: overrides.sanity ?? 4,
            knowledge: overrides.knowledge ?? 3
        },
        currentRoom: overrides.currentRoom ?? null,
        items: overrides.items ?? [],
        omens: overrides.omens ?? [],
        isAlive: overrides.isAlive ?? true
    };
}

export function runCharacterPresentationTest() {
    console.log("\n===== Character Presentation Test =====");
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
     * CASE 1 — Query builds correct Model from Runtime
     * ========================= */
    {
        const player = createFakePlayer({
            currentRoom: { tile: { name: "Entrance Hall" } },
            items: [{ id: "item1" }, { id: "item2" }],
            omens: [{ id: "omen1" }]
        });

        const fakeTurnManager = {
            getCurrentPlayer() { return player; }
        };

        const query = new CharacterPresentationQuery({ turnManager: fakeTurnManager });
        const model = query.buildModel({ scenarioId: "test" });

        assert(model instanceof CharacterPresentationModel, "Case 1a: returns CharacterPresentationModel");
        assert(model.playerId === "p1", "Case 1b: playerId correct");
        assert(model.displayName === "Brandon Jaspers", "Case 1c: displayName from character.name");
        assert(model.characterName === "Brandon Jaspers", "Case 1d: characterName correct");
        assert(model.currentRoomName === "Entrance Hall", "Case 1e: currentRoomName from tile.name");
        assert(model.speed === 4, "Case 1f: speed correct");
        assert(model.might === 4, "Case 1g: might correct");
        assert(model.sanity === 4, "Case 1h: sanity correct");
        assert(model.knowledge === 3, "Case 1i: knowledge correct");
        assert(model.inventoryCount === 2, "Case 1j: inventoryCount from items.length");
        assert(model.omenCount === 1, "Case 1k: omenCount from omens.length");
        assert(model.lifeState === "Alive", "Case 1l: lifeState Alive when isAlive true");
    }

    /* =========================
     * CASE 2 — Model is immutable
     * ========================= */
    {
        const model = new CharacterPresentationModel({
            playerId: "p1", displayName: "Test", characterName: "Test",
            currentRoomName: null, speed: 4, might: 4, sanity: 4, knowledge: 4,
            inventoryCount: 0, omenCount: 0, lifeState: "Alive"
        });

        let threw = false;
        try { model.displayName = "Changed"; } catch { threw = true; }
        assert(threw, "Case 2a: displayName immutable");

        threw = false;
        try { model.speed = 99; } catch { threw = true; }
        assert(threw, "Case 2b: speed immutable");

        threw = false;
        try { model.lifeState = "Changed"; } catch { threw = true; }
        assert(threw, "Case 2c: lifeState immutable");
    }

    /* =========================
     * CASE 3 — Traits update reflected in Panel
     * ========================= */
    {
        const player = createFakePlayer({ speed: 4 });
        const fakeTurnManager = {
            getCurrentPlayer() { return player; }
        };

        const container = { textContent: "" };
        const panel = new CharacterPanel({ container });
        const query = new CharacterPresentationQuery({ turnManager: fakeTurnManager });

        let model = query.buildModel({ scenarioId: "test" });
        panel.render(model);
        assert(container.textContent.includes("Speed: 4"), "Case 3a: initial speed 4");

        player.stats.speed = 7;
        model = query.buildModel({ scenarioId: "test" });
        panel.render(model);
        assert(container.textContent.includes("Speed: 7"), "Case 3b: updated speed 7");

        panel.destroy();
    }

    /* =========================
     * CASE 4 — Current Room update reflected in Panel
     * ========================= */
    {
        const player = createFakePlayer({ currentRoom: null });
        const fakeTurnManager = {
            getCurrentPlayer() { return player; }
        };

        const container = { textContent: "" };
        const panel = new CharacterPanel({ container });
        const query = new CharacterPresentationQuery({ turnManager: fakeTurnManager });

        let model = query.buildModel({ scenarioId: "test" });
        panel.render(model);
        assert(!container.textContent.includes("Room:"), "Case 4a: no room when null");

        player.currentRoom = { tile: { name: "Library" } };
        model = query.buildModel({ scenarioId: "test" });
        panel.render(model);
        assert(container.textContent.includes("Room: Library"), "Case 4b: room updated to Library");

        panel.destroy();
    }

    /* =========================
     * CASE 5 — Inventory change reflected in summary
     * ========================= */
    {
        const player = createFakePlayer({ items: [], omens: [] });
        const fakeTurnManager = {
            getCurrentPlayer() { return player; }
        };

        const container = { textContent: "" };
        const panel = new CharacterPanel({ container });
        const query = new CharacterPresentationQuery({ turnManager: fakeTurnManager });

        let model = query.buildModel({ scenarioId: "test" });
        panel.render(model);
        assert(container.textContent.includes("Items: 0"), "Case 5a: initial items 0");

        player.items.push({ id: "item1" }, { id: "item2" });
        model = query.buildModel({ scenarioId: "test" });
        panel.render(model);
        assert(container.textContent.includes("Items: 2"), "Case 5b: items updated to 2");

        player.omens.push({ id: "omen1" });
        model = query.buildModel({ scenarioId: "test" });
        panel.render(model);
        assert(container.textContent.includes("Omens: 1"), "Case 5c: omens updated to 1");

        panel.destroy();
    }

    /* =========================
     * CASE 6 — CharacterPanel has no Player reference
     * ========================= */
    {
        const container = { textContent: "" };
        const panel = new CharacterPanel({ container });

        const panelKeys = Object.getOwnPropertyNames(panel);
        const hasPlayer = panelKeys.some(k =>
            k.toLowerCase().includes("player")
        );
        assert(!hasPlayer, "Case 6a: CharacterPanel has no Player reference");

        const model = new CharacterPresentationModel({
            playerId: "p1", displayName: "Test", characterName: "Test",
            currentRoomName: null, speed: 4, might: 4, sanity: 4, knowledge: 4,
            inventoryCount: 0, omenCount: 0, lifeState: "Alive"
        });
        panel.render(model);
        assert(container.textContent.includes("Test"), "Case 6b: Panel renders from Model only");

        panel.destroy();
    }

    /* =========================
     * CASE 7 — CharacterPanel has no Runtime reference
     * ========================= */
    {
        const container = { textContent: "" };
        const panel = new CharacterPanel({ container });

        const panelKeys = Object.getOwnPropertyNames(panel);
        const hasRuntime = panelKeys.some(k =>
            k.toLowerCase().includes("runtime")
        );
        assert(!hasRuntime, "Case 7a: CharacterPanel has no Runtime reference");

        const hasEventBus = panelKeys.some(k =>
            k.toLowerCase().includes("eventbus") || k.toLowerCase().includes("subscribe")
        );
        assert(!hasEventBus, "Case 7b: CharacterPanel has no EventBus reference");

        panel.destroy();
    }

    /* =========================
     * CASE 8 — Query does not modify Domain
     * ========================= */
    {
        const player = createFakePlayer({
            speed: 4, items: [{ id: "item1" }], omens: []
        });
        const fakeTurnManager = {
            getCurrentPlayer() { return player; }
        };

        const statsBefore = { ...player.stats };
        const itemsBefore = player.items.length;
        const omensBefore = player.omens.length;

        const query = new CharacterPresentationQuery({ turnManager: fakeTurnManager });
        query.buildModel({ scenarioId: "test" });

        assert(player.stats.speed === statsBefore.speed, "Case 8a: speed unchanged");
        assert(player.stats.might === statsBefore.might, "Case 8b: might unchanged");
        assert(player.stats.sanity === statsBefore.sanity, "Case 8c: sanity unchanged");
        assert(player.stats.knowledge === statsBefore.knowledge, "Case 8d: knowledge unchanged");
        assert(player.items.length === itemsBefore, "Case 8e: items unchanged");
        assert(player.omens.length === omensBefore, "Case 8f: omens unchanged");
    }

    /* =========================
     * CASE 9 — Null TurnManager / No Active Player returns EMPTY_MODEL
     * ========================= */
    {
        // Case 9a — null turnManager
        const queryNull = new CharacterPresentationQuery({ turnManager: null });
        const modelNull = queryNull.buildModel({ scenarioId: "test" });
        assert(modelNull instanceof CharacterPresentationModel, "Case 9a: null turnManager returns CharacterPresentationModel");
        assert(modelNull.playerId === null, "Case 9b: null turnManager returns empty playerId");
        assert(modelNull.displayName === "", "Case 9c: null turnManager returns empty displayName");
        assert(modelNull.lifeState === "Unknown", "Case 9d: null turnManager returns Unknown lifeState");

        // Case 9e — getCurrentPlayer returns null
        const fakeTurnManager = {
            getCurrentPlayer() { return null; }
        };
        const queryNullPlayer = new CharacterPresentationQuery({ turnManager: fakeTurnManager });
        const modelNullPlayer = queryNullPlayer.buildModel({ scenarioId: "test" });
        assert(modelNullPlayer instanceof CharacterPresentationModel, "Case 9e: null player returns CharacterPresentationModel");
        assert(modelNullPlayer.playerId === null, "Case 9f: null player returns empty playerId");
        assert(modelNullPlayer.lifeState === "Unknown", "Case 9g: null player returns Unknown lifeState");
    }

    /* =========================
     * CASE 10 — PresentationController refreshes CharacterPanel alongside other Panels
     * ========================= */
    {
        EventBus.clear();
        let actionRenderCount = 0;
        let turnRenderCount = 0;
        let characterRenderCount = 0;
        let lastCharacterModel = null;

        const fakeRuntime = {
            scenarioId: "s1",
            getActionAvailability: () => [{ type: "MOVE", enabled: true }]
        };

        const player = createFakePlayer({ speed: 5 });
        const fakeTurnManager = {
            getCurrentPlayer() { return player; }
        };

        const actionPanel = {
            render() { actionRenderCount++; },
            destroy() {}
        };

        const turnPanel = {
            render() { turnRenderCount++; },
            destroy() {}
        };

        const characterPanel = {
            render(model) { characterRenderCount++; lastCharacterModel = model; },
            destroy() {}
        };

        const actionQuery = new ActionAvailabilityQuery();
        const turnQuery = new TurnPresentationQuery({ turnManager: fakeTurnManager });
        const characterQuery = new CharacterPresentationQuery({ turnManager: fakeTurnManager });

        const controller = new PresentationController({
            runtimeProvider: () => fakeRuntime,
            panels: new Map([
                ["action", { panel: actionPanel, query: actionQuery }],
                ["turn", { panel: turnPanel, query: turnQuery }],
                ["character", { panel: characterPanel, query: characterQuery }]
            ])
        });
        controller.init();

        assert(actionRenderCount === 1, "Case 10a: ActionPanel render 一次");
        assert(turnRenderCount === 1, "Case 10b: TurnPanel render 一次");
        assert(characterRenderCount === 1, "Case 10c: CharacterPanel render 一次");
        assert(lastCharacterModel.speed === 5, "Case 10d: CharacterPanel Model speed 5");

        actionRenderCount = 0;
        turnRenderCount = 0;
        characterRenderCount = 0;

        EventBus.emit(EventTypes.TURN_CHANGED, { currentPlayerId: "p1", turnIndex: 1 });

        assert(actionRenderCount === 1, "Case 10e: TURN_CHANGED refreshes ActionPanel");
        assert(turnRenderCount === 1, "Case 10f: TURN_CHANGED refreshes TurnPanel");
        assert(characterRenderCount === 1, "Case 10g: TURN_CHANGED refreshes CharacterPanel");

        controller.destroy();
    }

    const elapsed = Date.now() - totalStart;
    console.log(`\n===== Character Presentation Test: ${passed} passed, ${failed} failed (${elapsed}ms) =====\n`);
}
