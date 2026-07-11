# Roadmap

Version: 5.1

---

## 專案成熟度

| Layer                 | 狀態     |
| --------------------- | -------- |
| Rule Engine           | 100% ✓   |
| Scenario Runtime      | 100% ✓   |
| Scenario Framework    | 100% ✓   |
| Scenario Authoring    | 100% ✓   |
| Scenario Packaging    | 100% ✓   |
| Scenario Testing      | 100% ✓   |
| Content Governance    | 100% ✓   |
| Secret Information    | 100% ✓   |
| Victory Framework     | 100% ✓   |
| Regression Testing    | 100% ✓   |
| Save / Load           | 100% ✓   |
| Presentation Layer    | 20%      |
| Multiplayer           | 0%       |
| Content Expansion     | 0%       |

---

# M1 — M10：Platform Construction

Status: COMPLETE

涵蓋範圍：

```
M1  — Exploration Engine
M2  — Haunt Foundation
M3  — Scenario Runtime
M4  — Victory Framework
M5  — First Playable Haunt
M6  — Information-Aware Scenario
M7  — Scenario Content Governance
M8  — Scenario Lifecycle Contract
M9  — Scenario Regression Testing
M10 — Scenario Content Packaging
```

專案已完成從 Rule Engine 到 Content Packaging 的完整架構。

目前平台上線的完整管線：

```
Scenario Authoring
        ↓
Scenario Packaging (Bundle)
        ↓
Bundle Registry
        ↓
Scenario Loader
        ↓
Scenario Registry
        ↓
Scenario Runtime
        ↓
Information Router
        ↓
Victory
        ↓
Regression
```

無需繼續投入基礎架構建設。

---

# M11（舊計畫）：Version & Compatibility Platform

Status: CANCELLED

理由：
- 原規劃為 Plugin、DLC、第三方 Bundle、Engine Version Migration 建立平台
- 本專案定位為本機開發專案，無外部內容生態系需求
- 現有 Bundle Layer + RuntimeRegistry 已保留 Plugin Architecture 的 extension point
- TECH-DEBT-034（Bundle Compatibility Matrix）降為 LOW Priority，不排入開發

---

# M11：Framework Consumer Validation（IN PROGRESS）

方向從「架構建設」切換為「Content 作為 Framework 的 Consumer」。

驗證 Scenario Platform 能支撐多個內容差異化、互不耦合的正式 Scenario。

```
Architecture KPI（所有 Content Pack 的品質門檻）：

新增一個 Scenario 所需：
  Framework 修改：    0
  Runtime 修改：      0
  Infrastructure 修改：0
  Regression 修改：    0

只新增：
  Scenario
  VictoryCondition
  Definition
  Bundle
  Tests
```

## Phase 11A — feature/haunt-content-pack-01（COMPLETE）

Mission：5 個 Scenario 涵蓋 5 種型態（Collection、Survival、Escort、Boss Fight、Puzzle），
使用既有 Authoring → Bundle → Loader → Runtime 流程，Framework 零修改。

驗收標準：
- 新增至少 5 個可遊玩的 Haunt Scenario ✓
- 全部使用既有 Authoring、Bundle、Loader、Runtime 流程 ✓
- 不允許為個別劇本修改 Framework ✓
- 每個 Scenario 通過 Scenario Test Harness 與 Regression Test ✓
- 驗證 Information Router、Victory Framework、Scenario Runtime 在不同劇本下皆可正常運作 ✓

## Phase 11B — feature/gameplay-action-system（COMPLETE）

Mission：
建立 Scenario 與玩家行為之間的正式互動模型（PlayerAction Layer），
讓 Scenario 由玩家行為驅動，而非測試直接修改 State。

驗收標準：
- PlayerAction Value Object（id, type, playerId, payload）
- ActionValidator Contract-only 驗證
- ScenarioRuntime.handleAction() 委派
- HauntScenario.onAction() hook
- PuppetMasterScenario 支援 DESTROY → dollsDestroyed++
- Snapshot → Restore → Continue Action → Victory 流程
- Multi-runtime Action 隔離
- 0 Framework regression

檔案變更：
```
CREATE  src/scenario/action/ActionType.js
CREATE  src/scenario/action/PlayerAction.js
CREATE  src/scenario/action/ActionValidator.js
CREATE  src/scenario/action/ScenarioActionHandler.js
CREATE  src/test/GameplayActionTest.js

MODIFY  HauntScenario.js        (+onAction)
MODIFY  ScenarioRuntime.js      (+handleAction)
MODIFY  ScenarioState.js        (+increment)
MODIFY  PuppetMasterScenario.js (+onAction)
MODIFY  testRunner.js
MODIFY  docs/CONSTRAINTS.md     (+CONSTRAINT-034, 035)
```

CONSTRAINTS 新增：
- CONSTRAINT-034 — PlayerAction 為唯一 Gameplay Input
- CONSTRAINT-035 — ActionValidator 僅驗證 Action Contract

## Phase 11C — feature/gameplay-expansion（Planned）

Mission：
逐步將剩餘 4 個 Scenario（HungryHouse, ClockTower, BoundSpirits, RitualOfShadows）
從 state.set() 遷移至 onAction()，Framework 零修改。

---

# M12：Content Expansion

Status: Planned

目標為更多內容量產：

- 更多 Haunt Pack
- 更多 Event Card
- 更多 Omen
- 更多 Item
- 更多角色
- 更多房間

全部透過 M1~M10 建立的 Content Pipeline，不修改 Framework。

---

# M13：Presentation Layer

Status: In Progress

## M13A — Presentation Controller Foundation ✅

- PresentationController 作為 Presentation Layer 唯一協調者
- ActionAvailabilityQuery 改為 instance-based
- CONSTRAINT-045, CONSTRAINT-046 建立

## M13B — Turn UI ✅

- TurnQuery / TurnPresentationModel
- TurnPanel（Current Player, Turn Number, Phase）

## M13C — Scenario & Victory Presentation Foundation ✅

- Runtime Query Interface: getScenarioMetadata() / getVictoryResult()
- ScenarioPresentationQuery / ScenarioPresentationModel / ScenarioPanel
- VictoryPresentationQuery / VictoryPresentationModel / VictoryPanel
- PresentationController.register() + GAME_ENDED
- CONSTRAINT-048

## M13D — Card UI

## M13E — Player Information UI（InformationRouter 前端整合）

---

# M14：Multiplayer Synchronization

Status: Planned

在單機內容與 UI 穩定後，再將既有 Rule Engine 接回多人同步。

現有架構已支援：
- GameState 同步
- ScenarioState 同步
- InformationRouter Audience 同步
- Snapshot Protocol

待 M13 Presentation Layer 完成後啟動。

---

# 已取消的舊 Milestone

| 舊 Milestone | 原規劃 | 取消原因 |
|---|---|---|
| M9 Multiplayer Server | Socket Layer, Room Mgmt | 移至 M14 |
| M10 Multiplayer Sync | Snapshot Protocol | 移至 M14 |
| M11 Version Platform | Plugin, DLC, Migration | 不需要（本機專案） |
| M11 UI/Animation | UI Layer | 重組為 M13 |
