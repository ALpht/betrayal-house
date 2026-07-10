# M12B — Presentation Query & Panel Rendering

Version: 1.0
Status: COMPLETE

---

## Mission

建立真正的 Presentation Query Layer，讓 UI 能根據 Runtime 狀態取得可呈現資訊，並完成 ActionPanel 的動態渲染。

本階段定位為 **Presentation Query + Rendering Foundation**，非完整 UI Framework。

---

## Architecture

```
ScenarioRuntime
        │
        ▼  getActionAvailability()
ActionAvailabilityQuery
        │
        ▼  buildModel()
ActionPresentationModel (Immutable DTO)
        │
        ▼  render(model)
ActionPanel (Passive View)
        │
        ▼  onAction(type) → ActionFactory → PlayerAction
ActionButton
        │
        ▼  dispatch
Dispatcher → Runtime → Scenario
```

---

## What Was Built

### New Files: `src/presentation/query/` (2 files)

| File | Responsibility | Lines |
|------|----------------|-------|
| `ActionAvailabilityQuery.js` | Stateless query：`runtime → PresentationModel` | 12 |
| `ActionPresentationModel.js` | Immutable DTO：`actions[] + scenarioId` | 22 |

### Modified Files: 8 files

| File | Change |
|------|--------|
| `HauntScenario.js` | +`getActionAvailability(context, state)` base (all enabled) |
| `ScenarioRuntime.js` | +`getActionAvailability()` delegate to scenario |
| 5× Haunt Scenarios | Override `getActionAvailability()` with state-based logic |
| `ActionPanel.js` | Refactored：接受 `model` + `onAction` callback，移除 Runtime 依賴 |
| `ActionAvailability.js` | **Removed** (retired) |

### Test Files: 2 files

| File | Coverage |
|------|----------|
| `PresentationRenderingTest.js` | 10 cases, 30 assertions |
| `testRunner.js` | +1 registration |

---

## Domain Logic: Availability per Scenario

| Scenario | Action | Enabled When | Disabled Reason |
|----------|--------|--------------|-----------------|
| **PuppetMaster** | DESTROY | `dollsDestroyed < 3 && !gameOver` | "All dolls destroyed" / "Game over" |
| | END_TURN | always | — |
| **ClockTower** | ATTACK | `bossHp > 0` | "Boss defeated" |
| | COLLECT | `partsFound < 4` | "All parts collected" |
| | END_TURN | always | — |
| **HungryHouse** | MOVE | `!heroInSafeRoom && turnsElapsed < maxTurns` | "Already in safe room" / "Time ran out" |
| | END_TURN | always | — |
| **BoundSpirits** | INTERACT | `spiritAlive && escortProgress < 3` | "Spirit destroyed" / "Escort complete" |
| | ATTACK | `spiritAlive` | "Spirit already destroyed" |
| | END_TURN | always | — |
| **RitualOfShadows** | ACTIVATE | `!allActivated` | "Ritual complete" |
| | END_TURN | always | — |

---

## Design Decisions

### 1. Availability Owner = Domain (Runtime)

```
Scenario
    ↓
Runtime.getActionAvailability()
    ↓
Query Layer (pure transform)
    ↓
PresentationModel
    ↓
UI
```

- **Scenario 計算 Availability**（知道 bossHp、dollsDestroyed 等 state）
- **Query 只組裝**（不包含任何 Gameplay Rule）
- **UI 只渲染**（不知道 Runtime、State、Scenario）

### 2. Query Layer = Stateless Pure Function

```js
ActionAvailabilityQuery.buildModel(runtime)
```

- 不 cache、不 observe、不 dirty flag
- 每次查詢都根據當前 Runtime 狀態計算

### 3. PresentationModel = Immutable DTO

```js
{
    actions: Object.freeze([{ type, enabled, reason }]),
    scenarioId: "puppetMaster"
}
```

- 凍結陣列與物件
- 僅含 UI 所需欄位
- 無 timestamp（M12B 不需要）

### 4. Panel = Passive View

```js
new ActionPanel({ container, playerId, onAction })
panel.render(model)
```

- 不持有 Runtime 引用
- 不訂閱 EventBus（留給 M13 PresentationController）
- dispatch 後由外部重新呼叫 `render(newModel)`

---

## Constraints Added

| Constraint | Content |
|------------|---------|
| **CONSTRAINT-043** | Presentation Query Layer 不得推導 Gameplay Rule。只能 Read、Transform、Present。不能 Infer、Validate、Judge、Execute。 |
| **CONSTRAINT-044** | Presentation Component 不得依賴 Runtime。只能依賴 PresentationModel。 |

---

## Test Results

### New: PresentationRenderingTest — 30/30 passed

| Case | Name | Verified |
|------|------|----------|
| 1 | Query builds correct model | Model type, scenarioId, actions array |
| 2 | Model contains all supported actions | ClockTower: ATTACK, COLLECT, END_TURN |
| 3 | Disabled state reflected | ATTACK disabled when bossHp=0, reason set |
| 4 | Enabled state reflected | ATTACK, COLLECT enabled initially |
| 5 | Query Layer does not modify Runtime | State unchanged after query |
| 6 | Panel only sends PlayerAction via callback | onAction called, valid PlayerAction produced |
| 7 | Panel does not hold Runtime reference | No runtime-like keys in panel |
| 8 | Model is immutable | Cannot push to actions, cannot mutate action |
| 9 | HungryHouse availability logic | MOVE disabled after safe room / time out |
| 10 | RitualOfShadows availability logic | ACTIVATE disabled after all altars |

### Existing Tests — 0 failures

| Suite | Results |
|-------|---------|
| HauntContentPack01Test | 85/85 passed |
| GameplayActionTest | 28/28 passed |
| GameplayBehaviorTest | 81/81 passed |
| PresentationActionTest | 57/57 passed |
| ScenarioFrameworkTest | 11/11 passed |
| ScenarioRuntimeTest | 22/22 passed |
| ... (all 27 suites) | **0 failures** |

---

## Bug Fixes During Development

| Issue | Location | Fix |
|-------|----------|-----|
| DESTROY button mapped to `createAttack` | `ActionPanel.js:#createAction` | Changed to `createDestroy` |

---

## Modified File Summary

```
New:        src/presentation/query/ActionAvailabilityQuery.js
New:        src/presentation/query/ActionPresentationModel.js
New:        src/test/PresentationRenderingTest.js

Modified:   src/scenario/HauntScenario.js                     (+getActionAvailability base)
Modified:   src/scenario/runtime/ScenarioRuntime.js           (+getActionAvailability delegate)
Modified:   src/scenario/scenarios/haunts/PuppetMasterScenario.js     (+override)
Modified:   src/scenario/scenarios/haunts/ClockTowerScenario.js       (+override)
Modified:   src/scenario/scenarios/haunts/HungryHouseScenario.js      (+override)
Modified:   src/scenario/scenarios/haunts/BoundSpiritsScenario.js     (+override)
Modified:   src/scenario/scenarios/haunts/RitualOfShadowsScenario.js  (+override)
Modified:   src/presentation/ActionPanel.js                     (refactor: model + callback)
Removed:    src/presentation/ActionAvailability.js              (retired)
Modified:   src/test/PresentationActionTest.js                  (removed ActionAvailability import)
Modified:   src/testRunner.js                                   (+runPresentationRenderingTest)
Modified:   docs/CONSTRAINTS.md                                 (+CONSTRAINT-043, 044)
```

---

## What Was NOT Changed

```
Framework Modified:          0
Runtime Modified:            0  (only delegate added, no Gameplay logic)
Infrastructure Modified:     0
ScenarioController Modified: 0
Regression Modified:         0
EventBus/EventTypes:         0 new events
```

---

## Validation Summary

```
Framework Modified:          0
Runtime Modified:            0
Infrastructure Modified:     0
Regression Modified:         0
ScenarioController Modified: 0

Presentation Query Layer:    2 files
Presentation Model:          1 file
Panel Refactor:              1 file
Availability Overrides:      5 scenarios
CONSTRAINT-043:              Added ✅
CONSTRAINT-044:              Added ✅

Query → Model → Panel:       PASS
Availability State → Disabled Buttons:  PASS
Re-render on State Change:   PASS (via external render call)
Query Layer No Runtime Mutation:  PASS
Rendering No Gameplay Rules:  PASS
Presentation → PlayerAction Only:  PASS

All existing tests:          0 failures ✅
npm run build:               ✅
```

---

## Project Status

| Layer | Status |
|-------|--------|
| Rule Engine | 100% |
| Scenario Platform | 100% |
| Scenario Testing | 100% |
| Gameplay Core | 100% |
| Content Pipeline | 100% |
| Secret Information | 100% |
| **Presentation Layer** | **50%** |
| Multiplayer | 0% |
| Content Expansion | 0% |

---

## Next: M13 — Presentation Controller & Multi-Panel

M12B 完成後，Presentation Layer 具備：

- Query Layer（查詢）
- Presentation Model（資料）
- Passive Panels（渲染）

M13 建議建立統一的 **PresentationController**：

```text
EventBus
      │
      ▼
PresentationController
      │
      ├── TurnQuery
      ├── ActionQuery
      ├── CardQuery
      ├── VictoryQuery
      │
      ▼
Presentation Models
      │
      ▼
Panels (TurnPanel, ActionPanel, CardPanel, VictoryPanel)
```

如此可讓所有 Panel 保持被動，事件訂閱與重新查詢集中於單一控制器，避免各自訂閱 EventBus 造成生命週期管理混亂。

---

I'm a mushroom