import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";
import { PresentationController } from "../presentation/controller/PresentationController.js";
import { TurnPresentationQuery } from "../presentation/TurnPresentationQuery.js";
import { TurnPresentationModel } from "../presentation/TurnPresentationModel.js";
import { TurnPanel } from "../presentation/TurnPanel.js";
import { ActionAvailabilityQuery } from "../presentation/query/ActionAvailabilityQuery.js";

export function runTurnPresentationTest() {
    console.log("\n===== Turn Presentation Test =====");
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

    /* =======================
     * CASE 1 — Query 建立正確的 Model
     * ======================= */
    {
        EventBus.clear();

        const fakeTurnManager = {
            getCurrentPlayer() {
                return { id: "p1", name: "Alice" };
            }
        };

        const query = new TurnPresentationQuery({ turnManager: fakeTurnManager });
        const model = query.buildModel(null);

        assert(model instanceof TurnPresentationModel, "Case 1a: 回傳 TurnPresentationModel");
        assert(model.currentPlayerName === "Alice", "Case 1b: currentPlayerName 正確");
    }

    /* =======================
     * CASE 2 — 回合切換後 Panel 收到更新的 Model
     * ======================= */
    {
        EventBus.clear();
        let lastRenderedName = null;

        let currentPlayer = { id: "p1", name: "Alice" };
        const fakeTurnManager = {
            getCurrentPlayer() { return currentPlayer; }
        };

        const fakePanel = {
            render(model) { lastRenderedName = model.currentPlayerName; },
            destroy() {}
        };

        const query = new TurnPresentationQuery({ turnManager: fakeTurnManager });

        const controller = new PresentationController({
            runtimeProvider: () => ({ scenarioId: "s1", getActionAvailability: () => [] }),
            panels: new Map([
                ["turn", { panel: fakePanel, query }]
            ])
        });
        controller.init();
        assert(lastRenderedName === "Alice", "Case 2a: 初始渲染 Alice");

        currentPlayer = { id: "p2", name: "Bob" };
        EventBus.emit(EventTypes.TURN_CHANGED, { currentPlayerId: "p2", turnIndex: 1 });
        assert(lastRenderedName === "Bob", "Case 2b: 回合切換後渲染 Bob");

        controller.destroy();
    }

    /* =======================
     * CASE 3 — Controller 可同時刷新 ActionPanel 與 TurnPanel
     * ======================= */
    {
        EventBus.clear();
        let actionRenderCount = 0;
        let turnRenderCount = 0;

        const fakeRuntime = {
            scenarioId: "s1",
            getActionAvailability: () => [{ type: "MOVE", enabled: true }]
        };

        const fakeTurnManager = {
            getCurrentPlayer() { return { id: "p1", name: "Alice" }; }
        };

        const actionPanel = {
            render() { actionRenderCount++; },
            destroy() {}
        };

        const turnPanel = {
            render() { turnRenderCount++; },
            destroy() {}
        };

        const actionQuery = new ActionAvailabilityQuery();
        const turnQuery = new TurnPresentationQuery({ turnManager: fakeTurnManager });

        const controller = new PresentationController({
            runtimeProvider: () => fakeRuntime,
            panels: new Map([
                ["action", { panel: actionPanel, query: actionQuery }],
                ["turn", { panel: turnPanel, query: turnQuery }]
            ])
        });
        controller.init();
        assert(actionRenderCount === 1, "Case 3a: ActionPanel render 一次");
        assert(turnRenderCount === 1, "Case 3b: TurnPanel render 一次");

        actionRenderCount = 0;
        turnRenderCount = 0;
        EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, {});
        assert(actionRenderCount === 1, "Case 3c: SCENARIO_RUNTIME_UPDATED 刷新 ActionPanel");
        assert(turnRenderCount === 1, "Case 3d: SCENARIO_RUNTIME_UPDATED 刷新 TurnPanel");

        actionRenderCount = 0;
        turnRenderCount = 0;
        EventBus.emit(EventTypes.TURN_CHANGED, {});
        assert(turnRenderCount === 1, "Case 3e: TURN_CHANGED 刷新 TurnPanel");
        assert(actionRenderCount === 1, "Case 3f: TURN_CHANGED 也刷新 ActionPanel（refreshAll）");

        controller.destroy();
    }

    /* =======================
     * CASE 4 — TurnPanel 不依賴 TurnManager
     * ======================= */
    {
        const container = { textContent: "" };
        const panel = new TurnPanel({ container });

        const model = new TurnPresentationModel({ currentPlayerName: "Charlie" });
        panel.render(model);
        assert(container.textContent === "Charlie", "Case 4a: TurnPanel 正確渲染 Model");

        const panelKeys = Object.getOwnPropertyNames(panel);
        const hasTurnManager = panelKeys.some(k =>
            k.toLowerCase().includes("turnmanager")
        );
        assert(!hasTurnManager, "Case 4b: TurnPanel 無 TurnManager 參考");

        panel.destroy();
    }

    /* =======================
     * CASE 5 — TurnPanel 不訂閱 EventBus
     * ======================= */
    {
        const container = { textContent: "" };
        const panel = new TurnPanel({ container });

        const panelKeys = Object.getOwnPropertyNames(panel);
        const hasEventBus = panelKeys.some(k =>
            k.toLowerCase().includes("eventbus") || k.toLowerCase().includes("subscribe")
        );
        assert(!hasEventBus, "Case 5: TurnPanel 無 EventBus 參考");
    }

    /* =======================
     * CASE 6 — TurnPresentationQuery 不修改 TurnManager
     * ======================= */
    {
        const callLog = [];
        const fakeTurnManager = {
            getCurrentPlayer() {
                callLog.push("getCurrentPlayer");
                return { id: "p1", name: "Alice" };
            }
        };

        const query = new TurnPresentationQuery({ turnManager: fakeTurnManager });
        query.buildModel(null);

        assert(callLog.length === 1, "Case 6a: 僅呼叫 getCurrentPlayer 一次");
        assert(callLog[0] === "getCurrentPlayer", "Case 6b: 未呼叫其他方法");

        const turnManagerKeys = Object.getOwnPropertyNames(fakeTurnManager);
        const hasMutation = turnManagerKeys.some(k =>
            typeof fakeTurnManager[k] === "function" && k !== "getCurrentPlayer"
        );
        assert(!hasMutation, "Case 6c: TurnManager 無被修改");
    }

    /* =======================
     * CASE 7 — Query Independence
     * TURN_CHANGED 更新 TurnPanel，但 ActionPanel 仍正常運作
     * 驗證 Controller 的 for-each-panel 是真正 Generic
     * ======================= */
    {
        EventBus.clear();
        let actionModel = null;
        let turnModel = null;

        const fakeRuntime = {
            scenarioId: "s1",
            getActionAvailability: () => [{ type: "MOVE", enabled: true }]
        };

        let currentPlayer = { id: "p1", name: "Alice" };
        const fakeTurnManager = {
            getCurrentPlayer() { return currentPlayer; }
        };

        const actionPanel = {
            render(model) { actionModel = model; },
            destroy() {}
        };

        const turnPanel = {
            render(model) { turnModel = model; },
            destroy() {}
        };

        const actionQuery = new ActionAvailabilityQuery();
        const turnQuery = new TurnPresentationQuery({ turnManager: fakeTurnManager });

        const controller = new PresentationController({
            runtimeProvider: () => fakeRuntime,
            panels: new Map([
                ["action", { panel: actionPanel, query: actionQuery }],
                ["turn", { panel: turnPanel, query: turnQuery }]
            ])
        });
        controller.init();

        const actionModelBefore = actionModel;
        const turnModelBefore = turnModel;

        currentPlayer = { id: "p2", name: "Bob" };
        EventBus.emit(EventTypes.TURN_CHANGED, { currentPlayerId: "p2", turnIndex: 1 });

        assert(turnModel.currentPlayerName === "Bob", "Case 7a: TurnPanel 收到 Bob");
        assert(actionModel !== actionModelBefore, "Case 7b: ActionPanel 收到新 Model 實例");
        assert(actionModel.actions.length === 1, "Case 7c: ActionPanel Model 仍正確");
        assert(actionModel.scenarioId === "s1", "Case 7d: ActionPanel scenarioId 未受影響");

        controller.destroy();
    }

    const elapsed = Date.now() - totalStart;
    console.log(`\n===== Turn Presentation Test: ${passed} passed, ${failed} failed (${elapsed}ms) =====\n`);
}
