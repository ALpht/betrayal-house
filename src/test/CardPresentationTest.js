import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";
import { InformationRouter } from "../scenario/information/InformationRouter.js";
import { InformationPacketFactory } from "../scenario/information/InformationPacketFactory.js";
import { InformationAudience } from "../scenario/information/InformationAudience.js";
import { InformationScope } from "../scenario/information/InformationScope.js";
import { IdGenerator } from "../scenario/information/IdGenerator.js";
import { CardInformationAdapter } from "../controller/CardInformationAdapter.js";
import { CardPresentationModel } from "../presentation/model/CardPresentationModel.js";
import { CardPresentationQuery } from "../presentation/query/CardPresentationQuery.js";
import { CardPanel } from "../presentation/panel/CardPanel.js";
import { PresentationController } from "../presentation/controller/PresentationController.js";
import { ActionAvailabilityQuery } from "../presentation/query/ActionAvailabilityQuery.js";
import { ActionPresentationModel } from "../presentation/query/ActionPresentationModel.js";
import { TurnPresentationQuery } from "../presentation/TurnPresentationQuery.js";
import { ScenarioPresentationQuery } from "../presentation/query/ScenarioPresentationQuery.js";
import { VictoryPresentationQuery } from "../presentation/query/VictoryPresentationQuery.js";

export function runCardPresentationTest() {
    console.log("\n===== Card Presentation Test =====");
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
     * CASE 1 — Runtime → Packet
     * CardInformationAdapter receives CARD_DRAWN, routes packet to router
     * ========================= */
    {
        EventBus.clear();
        IdGenerator._reset();
        const router = new InformationRouter();
        const adapter = new CardInformationAdapter({ router });

        const fakeCard = {
            id: "event_burning_man",
            name: "Burning Man",
            type: "event",
            description: "A man is on fire.",
            effect: "modifyStat",
            stat: "sanity",
            amount: -1
        };

        EventBus.emit(EventTypes.CARD_DRAWN, {
            deckType: "event",
            triggerType: "event",
            playerId: "hero_1",
            roomId: "room_1",
            cardId: fakeCard.id,
            card: fakeCard
        });

        const allPackets = router.getAllPackets();
        assert(allPackets.length === 1, "Case 1a: one packet routed");
        assert(allPackets[0].scope === InformationScope.CARD, "Case 1b: packet scope is CARD");
        assert(allPackets[0].payload.cardId === "event_burning_man", "Case 1c: payload has cardId");
        assert(allPackets[0].payload.name === "Burning Man", "Case 1d: payload has name");
        assert(allPackets[0].payload.type === "event", "Case 1e: payload has type");
        assert(allPackets[0].payload.description === "A man is on fire.", "Case 1f: payload has description");

        adapter.destroy();
        EventBus.clear();
    }

    /* =========================
     * CASE 2 — Packet → Model
     * CardPresentationQuery builds correct model from router packets
     * ========================= */
    {
        IdGenerator._reset();
        const router = new InformationRouter();

        const packet1 = InformationPacketFactory.create({
            audience: InformationAudience.ALL_PLAYERS,
            scope: InformationScope.CARD,
            payload: {
                playerId: "hero_1",
                cardId: "event_burning_man",
                name: "Burning Man",
                type: "event",
                description: "A man is on fire.",
                triggerType: "event",
                roomId: "room_1"
            }
        });
        router.route(packet1);

        const packet2 = InformationPacketFactory.create({
            audience: InformationAudience.ALL_PLAYERS,
            scope: InformationScope.CARD,
            payload: {
                playerId: "hero_1",
                cardId: "item_axe",
                name: "Axe",
                type: "item",
                description: "A sharp axe.",
                triggerType: "item",
                roomId: "room_2"
            }
        });
        router.route(packet2);

        const fakeRuntime = { router };
        const query = new CardPresentationQuery();
        const model = query.buildModel(fakeRuntime);

        assert(model instanceof CardPresentationModel, "Case 2a: returns CardPresentationModel");
        assert(model.cards.length === 2, "Case 2b: two cards");
        assert(model.cards[0].id === "event_burning_man", "Case 2c: first card id");
        assert(model.cards[0].name === "Burning Man", "Case 2d: first card name");
        assert(model.cards[1].id === "item_axe", "Case 2e: second card id");
        assert(model.cards[1].name === "Axe", "Case 2f: second card name");
    }

    /* =========================
     * CASE 3 — Immutable
     * CardPresentationModel is deeply frozen
     * ========================= */
    {
        const model = new CardPresentationModel({
            cards: [
                { id: "c1", name: "Card1", type: "event", description: "desc" }
            ],
            title: "Cards",
            emptyMessage: "None."
        });

        assert(model.title === "Cards", "Case 3a: title readable");
        assert(model.emptyMessage === "None.", "Case 3b: emptyMessage readable");
        assert(model.cards.length === 1, "Case 3c: cards readable");

        let threw = false;
        try { model.title = "Changed"; } catch { threw = true; }
        assert(threw, "Case 3d: model immutable");

        threw = false;
        try { model.cards.push({ id: "x" }); } catch { threw = true; }
        assert(threw, "Case 3e: cards array immutable");

        threw = false;
        try { model.cards[0].name = "Changed"; } catch { threw = true; }
        assert(threw, "Case 3f: card object immutable");
    }

    /* =========================
     * CASE 4 — Empty State
     * Query with no packets returns empty model with emptyMessage
     * ========================= */
    {
        const router = new InformationRouter();
        const fakeRuntime = { router };
        const query = new CardPresentationQuery();
        const model = query.buildModel(fakeRuntime);

        assert(model.cards.length === 0, "Case 4a: empty cards");
        assert(model.emptyMessage === "No cards drawn.", "Case 4b: emptyMessage present");
        assert(model.title === "Cards", "Case 4c: title present");
    }

    /* =========================
     * CASE 5 — Render
     * CardPanel renders model correctly
     * ========================= */
    {
        const container = { textContent: "" };
        const panel = new CardPanel({ container });

        const model = new CardPresentationModel({
            cards: [
                { id: "c1", name: "Burning Man", type: "event", description: "A man is on fire." },
                { id: "c2", name: "Axe", type: "item", description: "A sharp axe." },
                { id: "c3", name: "Skull", type: "omen", description: "A skull." }
            ],
            title: "Cards",
            emptyMessage: "No cards drawn."
        });

        panel.render(model);

        assert(container.textContent.includes("Cards:"), "Case 5a: renders title");
        assert(container.textContent.includes("[Event] Burning Man"), "Case 5b: renders event card");
        assert(container.textContent.includes("[Item] Axe"), "Case 5c: renders item card");
        assert(container.textContent.includes("[Omen] Skull"), "Case 5d: renders omen card");
        assert(container.textContent.includes("A man is on fire."), "Case 5e: renders description");

        panel.destroy();
        assert(container.textContent === "", "Case 5f: destroy clears container");
    }

    /* =========================
     * CASE 6 — Visibility
     * TRAITOR_ONLY card hidden from hero, visible to traitor
     * ========================= */
    {
        IdGenerator._reset();
        const router = new InformationRouter();

        const publicPacket = InformationPacketFactory.create({
            audience: InformationAudience.ALL_PLAYERS,
            scope: InformationScope.CARD,
            payload: {
                playerId: "hero_1",
                cardId: "event_public",
                name: "Public Card",
                type: "event",
                description: "Everyone sees this.",
                triggerType: "event",
                roomId: "room_1"
            }
        });
        router.route(publicPacket);

        const traitorPacket = InformationPacketFactory.create({
            audience: InformationAudience.TRAITOR_ONLY,
            scope: InformationScope.CARD,
            payload: {
                playerId: "traitor_1",
                cardId: "event_secret",
                name: "Secret Card",
                type: "event",
                description: "Only traitor sees this.",
                triggerType: "event",
                roomId: "room_2"
            }
        });
        router.route(traitorPacket);

        const heroVisible = router.getVisiblePackets("hero_1", "traitor_1");
        const heroCardPackets = heroVisible.filter(p => p.scope === InformationScope.CARD);
        assert(heroCardPackets.length === 1, "Case 6a: hero sees only public card");
        assert(heroCardPackets[0].payload.cardId === "event_public", "Case 6b: hero card is public");

        const traitorVisible = router.getVisiblePackets("traitor_1", "traitor_1");
        const traitorCardPackets = traitorVisible.filter(p => p.scope === InformationScope.CARD);
        assert(traitorCardPackets.length === 2, "Case 6c: traitor sees both cards");
    }

    /* =========================
     * CASE 7 — Controller Refresh
     * PresentationController refreshAll triggers CardPanel render
     * ========================= */
    {
        EventBus.clear();
        IdGenerator._reset();
        let cardRenderCount = 0;
        let lastCardModel = null;

        const router = new InformationRouter();

        const packet = InformationPacketFactory.create({
            audience: InformationAudience.ALL_PLAYERS,
            scope: InformationScope.CARD,
            payload: {
                playerId: "hero_1",
                cardId: "event_test",
                name: "Test Card",
                type: "event",
                description: "Test.",
                triggerType: "event",
                roomId: "room_1"
            }
        });
        router.route(packet);

        const fakeRuntime = {
            router,
            scenarioId: "test",
            getActionAvailability: () => [],
            getScenarioMetadata: () => ({
                id: "test",
                title: "Test",
                description: "Test scenario",
                difficulty: 1,
                objectives: { heroes: "Do stuff" }
            }),
            getVictoryResult: () => null
        };

        const cardPanel = {
            render(model) { cardRenderCount++; lastCardModel = model; },
            destroy() {}
        };

        const fakeActionPanel = { render() {}, destroy() {} };
        const fakeTurnPanel = { render() {}, destroy() {} };
        const fakeScenarioPanel = { render() {}, destroy() {} };
        const fakeVictoryPanel = { render() {}, destroy() {} };

        const controller = new PresentationController({
            runtimeProvider: () => fakeRuntime,
            panels: new Map([
                ["action", { query: new ActionAvailabilityQuery(), panel: fakeActionPanel }],
                ["turn", { query: { buildModel() { return new ActionPresentationModel({ actions: [], scenarioId: "test" }); } }, panel: fakeTurnPanel }],
                ["scenario", { query: new ScenarioPresentationQuery(), panel: fakeScenarioPanel }],
                ["victory", { query: new VictoryPresentationQuery(), panel: fakeVictoryPanel }],
                ["card", { query: new CardPresentationQuery(), panel: cardPanel }]
            ])
        });

        controller.init();
        assert(cardRenderCount === 1, "Case 7a: card panel rendered on init");
        assert(lastCardModel.cards.length === 1, "Case 7b: model has one card");
        assert(lastCardModel.cards[0].name === "Test Card", "Case 7c: correct card in model");

        cardRenderCount = 0;
        EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, { scenarioId: "test" });
        assert(cardRenderCount === 1, "Case 7d: card panel re-rendered on event");

        controller.destroy();
        EventBus.clear();
    }

    /* =========================
     * CASE 8 — Runtime Isolation
     * CardPanel has no Runtime reference
     * ========================= */
    {
        const container = { textContent: "" };
        const panel = new CardPanel({ container });

        const panelKeys = Object.getOwnPropertyNames(panel);
        const hasRuntime = panelKeys.some(k =>
            k.toLowerCase().includes("runtime")
        );
        assert(!hasRuntime, "Case 8a: CardPanel has no Runtime reference");

        const hasEventBus = panelKeys.some(k =>
            k.toLowerCase().includes("eventbus") || k.toLowerCase().includes("subscribe")
        );
        assert(!hasEventBus, "Case 8b: CardPanel has no EventBus reference");

        const hasCardDeck = panelKeys.some(k =>
            k.toLowerCase().includes("deck") || k.toLowerCase().includes("card")
        );
        assert(!hasCardDeck, "Case 8c: CardPanel has no CardDeck reference");
    }

    const elapsed = Date.now() - totalStart;
    console.log(`\n===== Card Presentation Test: ${passed} passed, ${failed} failed (${elapsed}ms) =====\n`);
}
