# M13C — Scenario & Victory Presentation Foundation

Version: 1.0
Status: COMPLETE

---

## Mission

建立遊戲進行中的核心資訊面板，讓玩家能看到目前 Scenario 的目標與勝負狀態。
建立 Runtime Query Interface，讓 Presentation Layer 以 Runtime 為唯一資料來源。

---

## Architecture

```
ScenarioRuntime
        │
        ├── getScenarioMetadata()  → 代理 HauntScenario
        ├── router.getVisiblePackets()  → InformationRouter
        └── getVictoryResult()  → cache from checkVictory
                │
                ▼
   ScenarioPresentationQuery / VictoryPresentationQuery
                │
                ▼
   ScenarioPresentationModel / VictoryPresentationModel (Immutable DTO)
                │
                ▼
        ScenarioPanel / VictoryPanel (Passive View)
```

---

## What Was Built

### Runtime Query Interface（前提）

`ScenarioRuntime` 新增兩個 Presentation Query Interface：

| Method | Responsibility |
|--------|---------------|
| `getScenarioMetadata()` | 代理 `definition.getPresentationMetadata()`，回傳 `{ id, title, description, difficulty, objectives }` |
| `getVictoryResult()` | 回傳最後一次 `checkVictory()` 的 cache 結果 |

**設計決策：**
- Metadata 不複製進 Runtime — Runtime 只做 proxy，Single Source of Truth 維持在 HauntScenario
- Victory Result cache 為 Runtime State，不是 Metadata，合理存於 Runtime
- `checkVictory()` 呼叫後自動 cache，不改變回傳值

### New Files: `src/presentation/` (6 files)

| File | Responsibility | Lines |
|------|----------------|-------|
| `model/ScenarioPresentationModel.js` | Immutable DTO: `scenarioName + objectiveText + visibleInfo` | 26 |
| `query/ScenarioPresentationQuery.js` | 唯一依賴 Runtime：`runtime → PresentationModel` | 32 |
| `panel/ScenarioPanel.js` | Passive View：渲染 scenario 資訊 | 31 |
| `model/VictoryPresentationModel.js` | Immutable DTO: `victoryState + winner + scenarioId` | 30 |
| `query/VictoryPresentationQuery.js` | 唯一依賴 Runtime：`runtime → PresentationModel` | 27 |
| `panel/VictoryPanel.js` | Passive View：渲染勝負狀態 | 24 |

### Modified Files: 13 files

| File | Change |
|------|--------|
| `HauntScenario.js` | +`getPresentationMetadata()` |
| `ScenarioRuntime.js` | +`getScenarioMetadata()`, +`getVictoryResult()`, +`#lastVictoryResult` cache |
| `PresentationController.js` | +`register(key, query, panel)`, +`GAME_ENDED` event |
| `TestScenario.js` | Enriched static meta: `title, description, difficulty, objectives` |
| `EscapeTheHouseScenario.js` | Enriched static meta |
| 5× Haunt Scenarios | Enriched static meta |
| `testRunner.js` | +2 imports, +2 calls |
| `docs/CONSTRAINTS.md` | +CONSTRAINT-048 |
| `docs/ROADMAP.md` | M13C description updated |

### Test Files: 2 files

| File | Cases | Assertions |
|------|-------|------------|
| `ScenarioPresentationTest.js` | 9 | 24 |
| `VictoryPresentationTest.js` | 8 | 30 |

---

## CONSTRAINT-048

```text
Presentation Query 必須遵守 Information Visibility，
不得繞過 InformationRouter 直接取得玩家不可見資料。

禁止：
  router.getAllPackets() 直接用於 PresentationModel
  ScenarioState 直接暴露給 PresentationModel
  Presentation 自行推導 Hidden Information

例如：
  禁止 Boss HP == 0 → 推論玩家知道 Boss 已死亡
  Presentation 必須相信 InformationRouter

允許：
  router.getVisiblePackets(playerId, traitorPlayerId)
  runtime.getScenarioMetadata()（非秘密資訊）
  runtime.getVictoryResult()（由 Runtime 公開的唯讀介面）
```

---

## PresentationController 變更

### `register(key, query, panel)`

正式化的 Panel 註冊介面，取代外部直接 `panels.set()`：

```js
controller.register("action", new ActionAvailabilityQuery(), actionPanel);
controller.register("turn", new TurnPresentationQuery({ turnManager }), turnPanel);
controller.register("scenario", new ScenarioPresentationQuery(), scenarioPanel);
controller.register("victory", new VictoryPresentationQuery(), victoryPanel);
```

M13D 之後 Panel 數量快速增加時，此介面已就緒。

### `GAME_ENDED` Event

Controller 新增 `GAME_ENDED` 事件監聽。任何 Gameplay Event 皆觸發 `refreshAll()`，不針對 Victory 寫特殊 Refresh。

---

## 依賴方向

```
Presentation Layer
        │
        ▼
    Runtime  ← 唯一資料來源
        │
        ├── getScenarioMetadata()
        │       (代理 HauntScenario.getPresentationMetadata)
        │
        ├── router.getVisiblePackets()
        │       (InformationRouter — CONSTRAINT-048)
        │
        └── getVictoryResult()
                (cache from checkVictory)
```

**Presentation 不知道：**
- ScenarioDefinition
- VictoryController
- GameStateManager
- PlayerManager
- InformationRouter（透過 Runtime 間接存取）

---

## Test Results

```text
Total:     323 PASS, 0 FAIL

New Tests:
  Scenario Presentation Test:  24 passed, 0 failed
  Victory Presentation Test:   30 passed, 0 failed

Existing Tests:
  All 29 existing test suites: 0 regressions
```

### Scenario Presentation Test (9 cases)

| Case | Description |
|------|-------------|
| 1 | ScenarioPresentationModel immutable |
| 2 | Query builds correct Model from Runtime |
| 3 | InformationRouter visibility filtering |
| 4 | Query does not modify Runtime |
| 5 | ScenarioPanel has no Runtime reference |
| 6 | ScenarioPanel does not subscribe to EventBus |
| 7 | ScenarioPanel renders Model correctly |
| 8 | Runtime getScenarioMetadata() returns correct shape |
| 9 | Runtime getVictoryResult() is null before checkVictory |

### Victory Presentation Test (8 cases)

| Case | Description |
|------|-------------|
| 1 | VictoryPresentationModel immutable + VictoryState enum frozen |
| 2 | Query: IN_PROGRESS (no victory result) |
| 3 | Query: HEROES_WIN |
| 4 | Query: TRAITOR_WIN |
| 5 | VictoryPanel has no Runtime reference |
| 6 | VictoryPanel does not subscribe to EventBus |
| 7 | VictoryPanel renders Model correctly |
| 8 | Controller refreshes all 4 panels simultaneously |

---

## Design Decisions

### 1. Runtime as Single Source of Truth

**決策：** Presentation Query 唯一資料來源為 Runtime，不直接依賴 Definition 或 VictoryController。

**原因：** 避免 Query 收集多個依賴（Runtime + Definition + GameState + ...），保持 DDD Ownership 乾淨。

### 2. Metadata 不複製進 Runtime

**決策：** `getScenarioMetadata()` 做 proxy 而非存副本。

**原因：** Metadata 本質是 Content Metadata，不是 Runtime State。Runtime 只負責轉發，不負責同步。

### 3. Victory Result Cache

**決策：** `checkVictory()` 自動 cache 結果，`getVictoryResult()` 讀取 cache。

**原因：** VictoryResult 是 Runtime State，合理存於 Runtime。Cache 是 `checkVictory()` 的副作用，不改變回傳值。

### 4. traitorPlayerId = null

**決策：** InformationRouter visibility 過濾時 traitorPlayerId 固定為 null。

**原因：** 單機模式下無需區分。Reserved for Multiplayer (M14)。

### 5. HauntScenario static meta enrichment

**決策：** 在 7 個 HauntScenario 子類的 static meta 中新增 title、description、difficulty、objectives。

**原因：** 讓 `getPresentationMetadata()` 能從 `getMeta()` 取得完整資訊，不需要額外的 metadata 物件。

---

## File Inventory

### New Files (8)

```
src/presentation/model/ScenarioPresentationModel.js     26 lines
src/presentation/query/ScenarioPresentationQuery.js     32 lines
src/presentation/panel/ScenarioPanel.js                  31 lines
src/presentation/model/VictoryPresentationModel.js      30 lines
src/presentation/query/VictoryPresentationQuery.js      27 lines
src/presentation/panel/VictoryPanel.js                   24 lines
src/test/ScenarioPresentationTest.js                   259 lines
src/test/VictoryPresentationTest.js                    311 lines
```

### Modified Files (13)

```
src/scenario/HauntScenario.js                            +11 lines
src/scenario/runtime/ScenarioRuntime.js                  +12 lines
src/presentation/controller/PresentationController.js    +5 lines
src/scenario/scenarios/TestScenario.js                   +9 lines (enriched meta)
src/scenario/scenarios/EscapeTheHouseScenario.js         +9 lines (enriched meta)
src/scenario/scenarios/haunts/PuppetMasterScenario.js   +12 lines (enriched meta)
src/scenario/scenarios/haunts/HungryHouseScenario.js    +12 lines (enriched meta)
src/scenario/scenarios/haunts/BoundSpiritsScenario.js   +12 lines (enriched meta)
src/scenario/scenarios/haunts/ClockTowerScenario.js     +12 lines (enriched meta)
src/scenario/scenarios/haunts/RitualOfShadowsScenario.js +12 lines (enriched meta)
src/testRunner.js                                       +4 lines
docs/CONSTRAINTS.md                                     +30 lines
docs/ROADMAP.md                                         ~10 lines changed
```

---

## 預期後續

M13C 完成後，Presentation Layer 架構：

```text
PresentationController
        │
        ├── Action Query    → ActionPanel
        ├── Turn Query      → TurnPanel
        ├── Scenario Query  → ScenarioPanel
        └── Victory Query   → VictoryPanel
```

Runtime Query Interface 已就緒：

```text
getSupportedActions()
getActionAvailability()
getScenarioMetadata()
getVictoryResult()
```

後續可自然擴充：

```text
getCardPresentation()     → Card UI (M13D)
getInventoryPresentation() → Inventory UI
getTurnPresentation()     → Turn UI 進階
```

Presentation 永遠不知道 Scenario、Controller、State、Definition。

---

## M13 系列總結

| Milestone | 完成內容 | 狀態 |
|-----------|---------|------|
| M12A | PlayerAction（Write Adapter） | ✅ |
| M12B | Query / PresentationModel / Passive View（Read Adapter） | ✅ |
| M13A | PresentationController（事件協調） | ✅ |
| M13B | Multi-Panel 驗證（Action + Turn） | ✅ |
| M13C | Scenario & Victory Presentation + Runtime Query Interface | ✅ |

**Presentation Foundation 正式結案。**

```text
Platform Foundation    ████████████████████ 100%
Gameplay Core          ████████████████████ 100%
Presentation Foundation ████████████████████ 100%
Content                ██░░░░░░░░░░░░░░░░░░ 10%
Game UI                ██████████████░░░░░░ 70%
Multiplayer            ░░░░░░░░░░░░░░░░░░░░  0%
```
