# M12A — Player Action Presentation Foundation

Version: 1.0
Status: COMPLETE

---

## Mission

建立 Presentation Layer。

將：

```
Player
    ↓
UI
    ↓
PlayerAction
```

正式接上已完成的 Gameplay Pipeline。UI 不包含任何 Gameplay Rule。

本階段定位為 **Presentation Adapter Foundation**，不是 UI Framework 開發。

---

## Architecture

```
Button
    ↓
ActionFactory
    ↓
PlayerAction
    ↓
ActionDispatcher
    ↓
ScenarioActionHandler.dispatch()
    ↓
ActionValidator.validate()
    ↓
ScenarioRuntime.handleAction()
    ↓
Scenario.onAction()
    ↓
ScenarioState updated
```

UI 只負責建立 `PlayerAction`，不介入任何遊戲規則。

---

## Design Decisions

### 1. `getSupportedActions()` — Scenario Capability, 不是 Availability

`getSupportedActions()` 表示 Scenario **可能會使用哪些 ActionType**，不是玩家**目前能不能按**。

例如：ClockTower 支援 ATTACK，即使 Boss 已死亡，ATTACK 仍出現在 Supported Actions。

真正送出 Action 後，Scenario 決定 ignore 或正常處理。

預設回傳空陣列 `[]`，採用 **fail-safe** 設計。

### 2. `ActionDispatcher` 委派 `ScenarioActionHandler.dispatch()`

不直接呼叫 `runtime.handleAction()`，完整保留 `ActionValidator` 與既有的 Validation Pipeline。

Presentation 永遠不知道 Validation、Runtime Lifecycle、Victory。

### 3. `ActionAvailability` 純 stateless

不 cache、不 observe、不 dirty flag。每次查詢都直接呼叫 `runtime.getSupportedActions()`。

如果未來有動態 Availability（例如拿到鑰匙才能 ATTACK），會是新的 `getAvailableActions(context, state)` API，不是修改現在這個 API。

### 4. 5 個 Scenario 同步 override `getSupportedActions()`

M12A 的驗證目標是**完整的 Presentation Pipeline**，不是僅驗證基底 API。

5 個 Scenario 各自宣告支援的 Action，讓 `ActionPanel → Button → Factory → Dispatcher → Scenario` 整條鏈得到完整測試。

---

## What Was Built

### New Files: `src/presentation/`（5 files）

```
src/presentation/
    ActionFactory.js          7 factory methods
    ActionDispatcher.js       dispatch(runtime, action) → ScenarioActionHandler.dispatch()
    ActionAvailability.js     getActions(runtime) → runtime.getSupportedActions()
    ActionButton.js           DOM button component（label, disabled state, onClick）
    ActionPanel.js            渲染可用 Action 清單，建立 Factory + Dispatcher
```

#### ActionFactory — 7 Factory Methods

```js
createMove(playerId, destination)      → PlayerAction
createAttack(playerId, target)         → PlayerAction
createCollect(playerId, itemId)        → PlayerAction
createActivate(playerId, altar)        → PlayerAction
createInteract(playerId, type)         → PlayerAction
createDestroy(playerId, target)        → PlayerAction
createEndTurn(playerId)                → PlayerAction
```

#### ActionDispatcher — 唯一入口

```js
ActionDispatcher.dispatch(runtime, action)
    ↓
ScenarioActionHandler.dispatch(runtime, action)
    ↓
ActionValidator.validate(action)
    ↓
runtime.handleAction(action)
```

#### ActionAvailability — 純 Query

```js
ActionAvailability.getActions(runtime)
    ↓
runtime.getSupportedActions()
    ↓
scenario.getSupportedActions()
    ↓
[actionType, actionType, ...]
```

#### ActionPanel — 渲染

將 `ActionAvailability` 的結果渲染為 `ActionButton`，每個 Button 點擊後走 `ActionFactory → ActionDispatcher` 路徑。

### Framework Extension Points（2 modified files）

| File | Change | Lines |
|------|--------|-------|
| `HauntScenario.js` | +`getSupportedActions()` → `[]` (base) | +4 |
| `ScenarioRuntime.js` | +`getSupportedActions()` → delegate | +4 |

### Scenario Overrides（5 modified files）

| Scenario | getSupportedActions() |
|----------|----------------------|
| PuppetMaster | `[DESTROY, END_TURN]` |
| HungryHouse | `[MOVE, END_TURN]` |
| ClockTower | `[ATTACK, COLLECT, END_TURN]` |
| BoundSpirits | `[INTERACT, ATTACK, END_TURN]` |
| RitualOfShadows | `[ACTIVATE, END_TURN]` |

### Architecture Governance（4 constraints added）

- **CONSTRAINT-038** — Presentation Layer 不得包含 Gameplay Rule
- **CONSTRAINT-039** — Presentation Layer 不得直接操作 ScenarioState
- **CONSTRAINT-040** — UI 為 Gameplay Consumer（UI → PlayerAction → Runtime → Scenario）
- **CONSTRAINT-041** — Supported Actions 為 Scenario Capability，不代表目前可執行

---

## Test Results

### New: PresentationActionTest — 57/57 passed（8 cases）

| Case | 名稱 | 驗證重點 |
|:----:|------|---------|
| 1 | **Move** | `ActionFactory.createMove(id)` → `dispatch` → Runtime.state updated |
| 2 | **Attack → Victory** | 10× `createAttack` → `dispatch` → `bossHp=0` → Victory |
| 3 | **Collect** | `createCollect` → `dispatch` → `partsFound=1` |
| 4 | **End Turn** | `createEndTurn` → `dispatch` → `turnsElapsed=1` |
| 5 | **Unavailable Action** | 5 scenarios × `getSupportedActions()` — 正確宣告 + 不支援的 action 不出現 |
| 6 | **Dispatcher Isolation** | Dispatcher 只有 `dispatch` 方法，不得直接修改 State / emit Event |
| 7 | **Factory Completeness** | 7 factory methods 全部產出合法 `PlayerAction`，通過 `ActionValidator` |
| 8 | **Full Integration** | 3× `createDestroy` → `dispatch` → PuppetMaster → `dollsDestroyed=3` → Victory |

### Existing Test Suites — 0 failures

| Suite | Results |
|-------|---------|
| HauntContentPack01Test | 85/85 passed |
| GameplayActionTest | 28/28 passed |
| GameplayBehaviorTest | 81/81 passed |
| ScenarioFrameworkTest | 11/11 passed |
| ScenarioRuntimeTest | 22/22 passed |
| EscapeTheHouseTest | 27/27 passed |
| ScenarioTestHarnessTest | 26/26 passed |
| InformationRouterTest | 29/29 passed |
| ScenarioLifecycleTest | 46/46 passed |
| ScenarioContractTest | 29/29 passed |
| ScenarioBatchRegressionTest | 8/8 passed |
| ScenarioBundleTest | 48/48 passed |

---

## Modified File Summary

```
New:        src/presentation/ActionFactory.js
New:        src/presentation/ActionDispatcher.js
New:        src/presentation/ActionAvailability.js
New:        src/presentation/ActionButton.js
New:        src/presentation/ActionPanel.js
New:        src/test/PresentationActionTest.js              (57 assertions, 8 cases)

Modified:   src/scenario/HauntScenario.js                    (+getSupportedActions → [])
Modified:   src/scenario/runtime/ScenarioRuntime.js          (+getSupportedActions → delegate)
Modified:   src/scenario/scenarios/haunts/PuppetMasterScenario.js     (+getSupportedActions → [DESTROY, END_TURN])
Modified:   src/scenario/scenarios/haunts/HungryHouseScenario.js      (+getSupportedActions → [MOVE, END_TURN])
Modified:   src/scenario/scenarios/haunts/ClockTowerScenario.js       (+getSupportedActions → [ATTACK, COLLECT, END_TURN])
Modified:   src/scenario/scenarios/haunts/BoundSpiritsScenario.js     (+getSupportedActions → [INTERACT, ATTACK, END_TURN])
Modified:   src/scenario/scenarios/haunts/RitualOfShadowsScenario.js  (+getSupportedActions → [ACTIVATE, END_TURN])
Modified:   src/testRunner.js                                          (register new test)
Modified:   docs/CONSTRAINTS.md                                        (+CONSTRAINT-038~041)
```

---

## What Was NOT Changed

```
Framework Modified:          0
Runtime Modified:            0
Infrastructure Modified:     0
Regression Modified:         0
ScenarioController Modified: 0
```

- **ScenarioController.js** — 不修改（Presentation 層透過 `ScenarioRuntime` 直接操作，不需要 Controller 介入）
- **ScenarioRuntimeFactory.js** — 不修改
- **ActionType.js** — 不修改（已涵蓋所有需要的類型）
- **ActionValidator.js** — 不修改
- **ScenarioActionHandler.js** — 不修改
- **ScenarioState.js** — 不修改
- **ScenarioContext.js** — 不修改
- **ScenarioServices.js** — 不修改
- **InformationRouter.js** — 不修改
- **Bundle / Registry / Loader system** — 不修改
- **Save / Load system** — 不修改
- **Regression infrastructure** — 不修改
- **Victory Framework** — 不修改

---

## Validation Summary

```
Framework Modified:          0
Runtime Modified:            0  (僅新增 delegate，無 Gameplay 邏輯)
Infrastructure Modified:     0
Regression Modified:         0
ScenarioController Modified: 0

Presentation Layer:          5 files (ActionFactory, ActionDispatcher, ActionAvailability, ActionButton, ActionPanel)
getSupportedActions():       5/5 Scenario override ✅
ActionFactory:               7 factory methods ✅
ActionDispatcher:            委派 ScenarioActionHandler.dispatch() ✅
ActionAvailability:          Stateless query ✅
CONSTRAINT-038~041:          4 constraints added ✅

Button → ActionFactory → Dispatcher → Scenario:   PASS
Button → ActionFactory → Dispatcher → Scenario → Victory:   PASS
Unavailable Action → Correctly excluded:           PASS
Dispatcher Isolation (no state mutation):          PASS
Factory Completeness (7/7 valid actions):          PASS

All existing tests: 0 failures ✅
```

---

## Project Status

| Layer              |   狀態 |
| ------------------ | ---: |
| Rule Engine        | 100% |
| Scenario Platform  | 100% |
| Scenario Testing   | 100% |
| Gameplay Core      | 100% |
| Content Pipeline   | 100% |
| Secret Information | 100% |
| Presentation Layer | 25%  |
| Multiplayer        |   0% |
| Content Expansion  |   0% |

---

## Next: M12B — Presentation Panel Rendering

M12A 確認了 `Button → ActionFactory → Dispatcher → Runtime → Scenario` 的輸入鏈路完整成立。

下一步將建立：

- `ActionPanel` 的完整渲染測試（DOM-based）
- `ActionButton` 的 disabled state 測試
- Scenario 狀態更新後 panel 的 re-render
- 為真正的 `getAvailableActions(context, state)`（Presentation Query Layer）保留演進空間
