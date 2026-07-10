# Phase 11A — Framework Consumer Validation

Branch: `feature/haunt-content-pack-01`
Status: **COMPLETE — 85 assertions passed, 0 failed**
Tag: `phase-11a`

---

## 摘要

建立第一批正式 Scenario Content Pack，驗證 Scenario Platform 作為純 Consumer 的承載力。

5 個劇本涵蓋 5 種遊戲型態，全部使用既有 Authoring → Bundle → Loader → Runtime 流程，**Framework 零修改**。

---

## Architecture KPI

```
Framework 修改：      0  ← ✓
Runtime 修改：        0  ← ✓
Infrastructure 修改： 0  ← ✓
Regression 修改：     0  ← ✓

僅新增：
  Scenario           (+5)
  VictoryCondition   (+5)
  Definition         (+1)
  Bundle             (+1)
  Tests              (+536 lines, 85 assertions)
```

---

## 5 Haunt Scenarios

| ID | 型態 | 設計 | Victory 條件 |
|---|---|---|---|
| `puppetMaster` | Collection | 英雄需破壞 3 個 Doll | `dollsDestroyed >= 3` (Hero) / `heroesAlive <= 0` (Traitor) |
| `hungryHouse` | Survival/Turn | 英雄存活 5 回合 | `turnCounter >= 5` (Hero) / `heroesAlive <= 0` (Traitor) |
| `boundSpirits` | Escort | 護送 Spirit 至安全點 | `spiritAlive && heroesAlive > 0` (Hero) / `!spiritAlive` (Traitor) |
| `clockTower` | Boss Fight/HP | 擊敗 Boss（10 HP） | `bossHp <= 0` (Hero) / `heroesAlive <= 0` (Traitor) |
| `ritualOfShadows` | Puzzle/Booleans | 啟動 3 個祭壇 | `altarA && altarB && altarC` (Hero) / `gameOver` (Traitor) |

---

## Content Pack 結構

```
src/scenario/scenarios/haunts/
├── PuppetMasterScenario.js          (39 行)
├── PuppetMasterVictoryCondition.js  (18 行)
├── HungryHouseScenario.js            (19 行)
├── HungryHouseVictoryCondition.js   (19 行)
├── BoundSpiritsScenario.js          (38 行)
├── BoundSpiritsVictoryCondition.js  (18 行)
├── ClockTowerScenario.js            (38 行)
├── ClockTowerVictoryCondition.js    (18 行)
├── RitualOfShadowsScenario.js       (13 行)
├── RitualVictoryCondition.js         (21 行)
├── HauntContentPack01Definition.js  (100 行)
└── HauntContentPack01Bundle.js      (31 行)
```

### Bundle 封裝

`HauntContentPack01Bundle.js` 實作 `ScenarioContentPack` 介面：

```js
{
  id: "haunt-content-pack-01",
  definitions: HAUNT_DEFINITIONS_LIST,
  metadata: { author, version, description }
}
```

### 建構流程

```
Bundle
  → definitions (5 HauntScenarioDefinition)
  → ScenarioLoader.load()
    → ScenarioValidator.validate()
    → ScenarioRegistry.register()
  → ScenarioRuntimeFactory.createFromDefinition()
  → ScenarioRuntime.start()
```

---

## InformationRouter 使用

3/5 個 Scenario 使用 Information Router（驗證 CONSTRAINT-014／015 相容）：

| Scenario | Hero 資訊 | Traitor 資訊 | Observer 資訊 |
|---|---|---|---|
| PuppetMaster | 目標 | 目標 + Doll 位置 | — |
| ClockTower | — | 目標 | Boss 血量 |
| BoundSpirits | 目標 | 目標 + Spirit 位置 | — |

---

## 生命週期回呼

`HungryHouseScenario` 實作 `onTurnEnd()` 展示 Lifecycle Hook 用法：

```
onTurnEnd(context, state)
  → turnCounter++ on each hero turn
  → 不自行 emit 事件（CONSTRAINT-006／規範 6）
```

---

## 測試結果 (10 Cases, 85 斷言)

| Case | 測試內容 | 斷言 | 結果 |
|---|---|---|---|
| 1 | Initial State (5 個 scenario) | 25 | PASS |
| 2 | Hero Victory Condition (5 個 scenario) | 25 | PASS |
| 3 | Traitor Victory Condition (5 個 scenario) | 25 | PASS |
| 4 | No Victory (5 個 scenario) | 25 | PASS |
| 5 | Lifecycle Callback (HungryHouse onTurnEnd) | 1 | PASS |
| 6 | Information Routing (3 scenario) | 3 | PASS |
| 7 | Snapshot Restore (ClockTower round-trip) | 1 | PASS |
| 8 | Scenario Isolation (跨 Runtime 不干擾) | 1 | PASS |
| 9 | Bundle Pipeline (Load → Validate → Register → Run) | 4 | PASS |
| 10 | Regression Snapshot (5 個 scenario) | 25 | PASS |

---

## 文件更新

| 文件 | 變更 |
|---|---|
| `docs/CONSTRAINTS.md` | Version 4.0 → 4.1，新增 CONSTRAINT-031（Content-only Changes）、CONSTRAINT-032（Lifecycle Hook 不得 emit EventBus）、CONSTRAINT-033（Content 必須是 Engine Consumer） |
| `docs/ROADMAP.md` | Version 5.0 → 5.1，Phase 11A 狀態從 Planned → Completed |

---

## 新增 Constraint

### CONSTRAINT-031 — Content-only Changes

```
Content Pack 新增 Scenario 必須遵守：
  新增：Scenario, VictoryCondition, Definition, Bundle, Test
  禁止：修改 Engine, Runtime, Infrastructure, 或任何 Framework 檔案
```

### CONSTRAINT-032 — Lifecycle Hook 不得 emit EventBus

```
Scenario Lifecycle Hook 內禁止 emit EventBus 事件。
所有事件發送由 ScenarioController 負責。
```

### CONSTRAINT-033 — Content 必須是 Engine Consumer

```
Content 僅能 extends/use Scenario Platform 基礎類別，
不得修改 Framework、Runtime、Infrastructure、或其他 Content。
```

---

## 技術債

| 編號 | 描述 | 狀態 |
|---|---|---|
| TECH-DEBT-032 | Compatibility Framework Missing | 未受影響 |
| TECH-DEBT-033 | RegressionContextFactory 與 ScenarioTestContext 重複 | 未受影響 |

無新增技術債。

---

## 專案狀態

```
RULE ENGINE             100%  ✓
SCENARIO FRAMEWORK      100%  ✓
SCENARIO AUTHORING      100%  ✓
SCENARIO PACKAGING      100%  ✓
SCENARIO TESTING        100%  ✓
INFORMATION VISIBILITY  100%  ✓
VICTORY FRAMEWORK       100%  ✓
REGRESSION TESTING      100%  ✓
CONTENT GOVERNANCE      100%  ✓
SAVE / LOAD             100%  ✓
─────────────────────────────────
CONTENT EXPANSION        5%   ★   ← NEW
PRESENTATION LAYER      20%
MULTIPLAYER              0%
```

---

## 下一步

### Phase 11B — Player Information UI

將 InformationRouter 接到 UI，讓秘密資訊（目標、Boss 血量、Spirit 位置）真正顯示給玩家。

### Phase 11C — Game UI Phase 1

完善 Turn UI、Card UI、Scenario UI、Victory UI，讓整體遊戲流程可實際遊玩。

---

## 學習記錄

1. **Scenarios 必須呼叫 `super.start(context, state)`** — 基底類別的 `#state` 由 `start()` 設定，子類別覆寫時需呼叫 `super.start()` 否則 `checkVictory()` 中 `this.#state` 為 null。
2. **State 是唯一溝通渠道** — VictoryCondition 讀取 `state.get(key)`、Scenario 寫入 `state.set(key)`，雙方不直接依賴對方類別。
3. **Test Harness 不需要 EventBus** — Content Pack 測試全部使用 `ScenarioTestHarness` + direct `state.set()`，無需生產環境的完整 EventBus 管線。
