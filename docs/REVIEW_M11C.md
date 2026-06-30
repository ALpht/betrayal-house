# M11C — Gameplay Behavior Validation

Version: 1.0
Status: COMPLETE

---

## Mission

驗證既有 Gameplay Action Layer 是否足以支撐不同 Gameplay Behavior，且新增內容不需修改 Framework。

本階段屬於 **Framework Consumer Validation**，不是 Gameplay Engine 開發。

將 5 個 Haunt 全部改為 Action-driven Scenario，驗證 5 種 Gameplay Pattern：

| Scenario          | 驗證 Pattern        |
| ----------------- | ----------------- |
| Puppet Master     | Collect           |
| Hungry House      | Move + End Turn   |
| Bound Spirits     | Escort / Interact |
| Clock Tower       | Attack            |
| Ritual of Shadows | Activate          |

---

## What Was Built / Modified

### Scenario Migrations（4 modified files）

正式 Gameplay Flow 改由 PlayerAction 驅動；測試仍可直接操作 ScenarioState 驗證規則。

| Scenario | 狀態 | 處理的 Action | 效果 |
|----------|:----:|--------------|------|
| HungryHouse | 已遷移 | `MOVE { destination: "safeRoom" }` → `heroInSafeRoom=true`<br>`END_TURN` → `turnsElapsed++` | Move + End Turn |
| BoundSpirits | 已遷移 | `INTERACT { type: "escort" }` → `escortProgress++`<br>`ATTACK { target: "spirit" }` → `spiritAlive=false` | Escort / Interact |
| ClockTower | 已遷移 | `ATTACK` → `bossHp--`（Scenario 決定傷害）<br>`COLLECT` → `partsFound++` | Attack |
| RitualOfShadows | 已遷移 | `ACTIVATE { altar }` → Scenario mapping 設定對應 state key | Activate |
| PuppetMaster | ✅ 前階段已遷移 | `DESTROY` → `dollsDestroyed++` | Collect |

#### 遷移原則

1. **Scenario 決定 ATTACK 效果**：ATTACK 不帶 `payload.damage`，Scenario 自行決定扣 1。Framework 永遠不知道戰鬥規則。
2. **State Key Ownership**：外部 payload 不直接成為 state key。Ritual 使用 explicit mapping（`if altar === "altarA"`），而非 `state.set(payload.altar, true)`。
3. **保留 `onTurnEnd()` 為相容 no-op**：不在此階段移除 Lifecycle hook，避免同時變更 Lifecycle API 與 Content。

### Payload Convention 固定

```
MOVE       { destination: string }
ATTACK     { target: string }          // Scenario 決定效果數值
INTERACT   { type: string }
COLLECT    { itemId: string }
ACTIVATE   { altar: string }           // Scenario mapping，非直接 state key
END_TURN   {}                          // 無 payload
```

### Unhandled Action Contract 規格化

```
Unhandled Action
↓
No-op
↓
不得 throw
不得修改 State
不得 emit Event
```

---

## Architecture Governance

### CONSTRAINT-036 — Gameplay Rule 必須存在於 Scenario

禁止 Framework Layer（ScenarioRuntime / ScenarioActionHandler / ActionValidator）出現：

```js
if attack...
if move...
if collect...
```

Framework 永遠不知道遊戲規則。

### CONSTRAINT-037 — ActionType 為 Gameplay Vocabulary

ActionType 不代表規則。`ATTACK` 不代表一定扣血。真正效果永遠由 `Scenario.onAction()` 決定。

---

## Test Results

### New: GameplayBehaviorTest — 81/81 passed（11 cases）

| Case | 名稱 | Scenario | 驗證重點 |
|:----:|------|----------|---------|
| 1 | **Move Action** | HungryHouse | `MOVE { destination: "safeRoom" }` → `heroInSafeRoom=true` |
| 2 | **Attack → Victory** | ClockTower | 10× ATTACK → `bossHp=0` → hero win |
| 3 | **Collect → Victory** | PuppetMaster | 3× DESTROY → `dollsDestroyed=3` → hero win |
| 4 | **Activate → Victory** | RitualOfShadows | 3× ACTIVATE → all altars true → hero win |
| 5 | **Escort → Victory** | BoundSpirits | 3× INTERACT → `escortProgress=3` → hero win |
| 6 | **Unhandled Action** | any | 有效 action type 送給不處理的 Scenario → no-op, no throw |
| 7 | **Action Sequence** | ClockTower | `COLLECT×4 → ATTACK×10` → Victory |
| 8 | **Snapshot Continue** | PuppetMaster | Action → save → restore (state+router) → continue → Victory |
| 9 | **Scenario Isolation** | All 5 | 5 runtimes 同時存在，各自 state 不跨汙染 |
| 10 | **Action Isolation** | ClockTower | Runtime A ATTACK 不影響 Runtime B |
| 11 | **Regression** | All 5 | Golden snapshot → replay → semantic compare 一致 |

### Existing Test Suites — 0 failures

| Suite | Results |
|-------|---------|
| HauntContentPack01Test | 85/85 passed（CASE 5 已從 `onTurnEnd()` 遷移至 `dispatch(END_TURN)`） |
| GameplayActionTest | 28/28 passed |
| ScenarioFrameworkTest | 11/11 passed |
| ScenarioRuntimeTest | 22/22 passed |
| EscapeTheHouseTest | 27/27 passed |
| ScenarioTestHarnessTest | 26/26 passed |
| InformationRouterTest | 29/29 passed |
| ScenarioLifecycleTest | 46/46 passed |
| ScenarioContractTest | 29/29 passed |
| ScenarioBatchRegressionTest | 8/8 passed |
| ScenarioBundleTest | 48/48 passed |
| All other suites | 0 failures |

---

## Modified File Summary

```
Modified:   src/scenario/scenarios/haunts/HungryHouseScenario.js      (+onAction MOVE/END_TURN)
Modified:   src/scenario/scenarios/haunts/BoundSpiritsScenario.js     (+onAction INTERACT/ATTACK)
Modified:   src/scenario/scenarios/haunts/ClockTowerScenario.js       (+onAction ATTACK/COLLECT)
Modified:   src/scenario/scenarios/haunts/RitualOfShadowsScenario.js  (+onAction ACTIVATE)
Modified:   src/test/HauntContentPack01Test.js                         (CASE 5: dispatch END_TURN)
New:        src/test/GameplayBehaviorTest.js                          (81 assertions, 11 cases)
Modified:   src/testRunner.js                                          (register new test)
```

---

## What Was NOT Changed

```
Framework Modified:     0
Runtime Modified:       0
Infrastructure Modified: 0
Regression Modified:    0
ScenarioController:     0
```

- **ScenarioRuntime.js** — 不修改（`handleAction()` 已存在）
- **ScenarioController.js** — 不修改（M11C 只管 Content，action routing 非必要）
- **ScenarioActionHandler.js** — 不修改
- **ActionValidator.js** — 不修改（CONSTRAINT-035 已滿足）
- **ActionType.js** — 不修改（已涵蓋所有需要的類型）
- **HauntScenario.js** — 不修改（`onAction` no-op hook 已存在）
- **ScenarioRuntimeFactory.js** — 不修改
- **InformationRouter.js** — 不修改
- **Bundle / Registry / Loader system** — 不修改
- **Save / Load system** — 不修改
- **Regression infrastructure** — 不修改

---

## Validation Summary

```
Framework Modified: 0
Runtime Modified: 0
Infrastructure Modified: 0
Regression Modified: 0
ScenarioController Modified: 0

5/5 Scenario Action-driven:       PASS  (PuppetMaster ✅, HungryHouse ✅, BoundSpirits ✅, ClockTower ✅, RitualOfShadows ✅)
5 Gameplay Patterns:              PASS  (Collect, Move+EndTurn, Escort/Interact, Attack, Activate)
Snapshot/Restore Continue:        PASS  (ScenarioState + InformationRouter 均完成 Restore，並可繼續接受 PlayerAction 直到 Victory)
Action Sequence (Single Runtime): PASS  (COLLECT×4 → ATTACK×10 → Victory)
Unhandled Action = No-op:         PASS  (不得 throw / modify state / emit event)
Scenario Isolation:               PASS  (5 runtimes 同時執行，互不干擾)
Action Isolation:                 PASS  (Runtime A 的 action 不影響 Runtime B)
Regression Snapshot:              PASS  (5 scenarios, golden snapshot → replay → compatible)
No New Tech Debt:                 PASS
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
| Multiplayer        |   0% |
| Presentation Layer |   0% |

---

## Next: Presentation Layer

M11C 完成後，整個 Gameplay Core（輸入 → 行為 → 狀態 → 勝利）已有完整實戰驗證。

後續往 UI 發展時，UI 幾乎只扮演 `PlayerAction` 的產生者，不介入任何遊戲規則。
