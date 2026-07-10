import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";
import { PresentationController } from "../presentation/controller/PresentationController.js";

export function runPresentationControllerTest() {
    console.log("\n===== Presentation Controller Test =====");
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
     * CASE 1 — init() 觸發初始渲染
     * ======================= */
    {
        EventBus.clear();
        let renderCount = 0;
        let lastModel = null;

        const fakeRuntime = {
            scenarioId: "testScenario",
            getActionAvailability: () => [
                { type: "MOVE", enabled: true, reason: null }
            ]
        };

        const fakePanel = {
            render(model) { renderCount++; lastModel = model; },
            destroy() {}
        };

        const fakeQuery = {
            buildModel(runtime) {
                return {
                    actions: runtime.getActionAvailability(),
                    scenarioId: runtime.scenarioId
                };
            }
        };

        const controller = new PresentationController({
            runtimeProvider: () => fakeRuntime,
            panels: new Map([
                ["action", { panel: fakePanel, query: fakeQuery }]
            ])
        });
        controller.init();
        assert(renderCount === 1, "Case 1a: init 後立即 render 一次");
        assert(lastModel.scenarioId === "testScenario", "Case 1b: 初始 render 有正確 model");
        controller.destroy();
    }

    /* =======================
     * CASE 2 — Event 觸發後 Query 更新 → Panel Render
     * ======================= */
    {
        EventBus.clear();
        let renderCount = 0;
        let lastModel = null;

        const fakeRuntime = {
            scenarioId: "testScenario",
            getActionAvailability: () => [
                { type: "MOVE", enabled: true, reason: null }
            ]
        };

        const fakePanel = {
            render(model) { renderCount++; lastModel = model; },
            destroy() {}
        };

        const fakeQuery = {
            buildModel(runtime) {
                return {
                    actions: runtime.getActionAvailability(),
                    scenarioId: runtime.scenarioId
                };
            }
        };

        const controller = new PresentationController({
            runtimeProvider: () => fakeRuntime,
            panels: new Map([
                ["action", { panel: fakePanel, query: fakeQuery }]
            ])
        });
        controller.init();
        renderCount = 0;

        EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, { scenarioId: "testScenario" });
        assert(renderCount === 1, "Case 2a: SCENARIO_RUNTIME_UPDATED 觸發一次 render");
        assert(lastModel.scenarioId === "testScenario", "Case 2b: Model 包含正確 scenarioId");
        controller.destroy();
    }

    /* =======================
     * CASE 3 — runtimeProvider 返回 null 時不 render
     * ======================= */
    {
        EventBus.clear();
        let renderCount = 0;

        const fakePanel = {
            render() { renderCount++; },
            destroy() {}
        };

        const fakeQuery = {
            buildModel() { return {}; }
        };

        const controller = new PresentationController({
            runtimeProvider: () => null,
            panels: new Map([
                ["action", { panel: fakePanel, query: fakeQuery }]
            ])
        });
        controller.init();
        renderCount = 0;

        EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, {});
        assert(renderCount === 0, "Case 3: runtime 為 null 時不 render");
        controller.destroy();
    }

    /* =======================
     * CASE 4 — Controller 不修改 Runtime
     * ======================= */
    {
        EventBus.clear();

        const fakeRuntime = {
            scenarioId: "testScenario",
            getActionAvailability: () => []
        };
        const snapshotBefore = JSON.stringify(fakeRuntime);

        const fakePanel = {
            render() {},
            destroy() {}
        };

        const fakeQuery = {
            buildModel(runtime) { return runtime; }
        };

        const controller = new PresentationController({
            runtimeProvider: () => fakeRuntime,
            panels: new Map([
                ["action", { panel: fakePanel, query: fakeQuery }]
            ])
        });
        controller.init();

        EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, {});
        assert(JSON.stringify(fakeRuntime) === snapshotBefore, "Case 4: Runtime 未被修改");
        controller.destroy();
    }

    /* =======================
     * CASE 5 — Panel 不直接訂閱 EventBus
     * ======================= */
    {
        const fakePanel = {
            render() {},
            destroy() {}
        };
        const panelKeys = Object.getOwnPropertyNames(fakePanel);
        const hasEventBus = panelKeys.some(k =>
            k.toLowerCase().includes("eventbus") || k.toLowerCase().includes("subscribe")
        );
        assert(!hasEventBus, "Case 5: Panel 無 EventBus 參考");
    }

    /* =======================
     * CASE 6 — destroy() 後不再觸發 render
     * ======================= */
    {
        EventBus.clear();
        let renderCount = 0;

        const fakeRuntime = {
            scenarioId: "testScenario",
            getActionAvailability: () => []
        };

        const fakePanel = {
            render() { renderCount++; },
            destroy() {}
        };

        const fakeQuery = {
            buildModel(runtime) { return {}; }
        };

        const controller = new PresentationController({
            runtimeProvider: () => fakeRuntime,
            panels: new Map([
                ["action", { panel: fakePanel, query: fakeQuery }]
            ])
        });
        controller.init();
        renderCount = 0;

        EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, {});
        assert(renderCount === 1, "Case 6a: destroy 前正常 render");

        controller.destroy();
        renderCount = 0;
        EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, {});
        assert(renderCount === 0, "Case 6b: destroy 後不再 render");
    }

    /* =======================
     * CASE 7 — 多次 Event 觸發正確 refresh
     * ======================= */
    {
        EventBus.clear();
        let renderCount = 0;

        const fakeRuntime = {
            scenarioId: "testScenario",
            getActionAvailability: () => []
        };

        const fakePanel = {
            render() { renderCount++; },
            destroy() {}
        };

        const fakeQuery = {
            buildModel(runtime) { return {}; }
        };

        const controller = new PresentationController({
            runtimeProvider: () => fakeRuntime,
            panels: new Map([
                ["action", { panel: fakePanel, query: fakeQuery }]
            ])
        });
        controller.init();
        renderCount = 0;

        EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, {});
        EventBus.emit(EventTypes.SCENARIO_STARTED, {});
        EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, {});
        assert(renderCount === 3, "Case 7: 三次 Event 觸發三次 render");
        controller.destroy();
    }

    /* =======================
     * CASE 8 — runtimeProvider 動態切換
     * ======================= */
    {
        EventBus.clear();
        let renderCount = 0;
        let lastModel = null;

        const runtimeA = {
            scenarioId: "scenarioA",
            getActionAvailability: () => [{ type: "MOVE", enabled: true, reason: null }]
        };
        const runtimeB = {
            scenarioId: "scenarioB",
            getActionAvailability: () => [{ type: "ATTACK", enabled: true, reason: null }]
        };

        let currentRuntime = runtimeA;

        const fakePanel = {
            render(model) { renderCount++; lastModel = model; },
            destroy() {}
        };

        const fakeQuery = {
            buildModel(runtime) {
                return {
                    actions: runtime.getActionAvailability(),
                    scenarioId: runtime.scenarioId
                };
            }
        };

        const controller = new PresentationController({
            runtimeProvider: () => currentRuntime,
            panels: new Map([
                ["action", { panel: fakePanel, query: fakeQuery }]
            ])
        });
        controller.init();
        assert(lastModel.scenarioId === "scenarioA", "Case 8a: 初始收到 runtimeA");

        currentRuntime = runtimeB;
        EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, {});
        assert(lastModel.scenarioId === "scenarioB", "Case 8b: 切換後收到 runtimeB");
        assert(lastModel.actions[0].type === "ATTACK", "Case 8c: runtimeB 的 action 不同");
        controller.destroy();
    }

    const elapsed = Date.now() - totalStart;
    console.log(`\n===== Presentation Controller Test: ${passed} passed, ${failed} failed (${elapsed}ms) =====\n`);
}
