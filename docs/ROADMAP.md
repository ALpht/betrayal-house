# Roadmap

Version: 5.0

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

---

# M1 — M10：Architecture Layer（完成）

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

# M11：Content Validation

方向從「架構建設」切換為「遊戲建設」。

目標：驗證 Scenario Platform 是否能量產真正可玩的內容。

```
Branch                     Phase     Status
────────────────────────────────────────────
feature/haunt-content-pack-01      11A    Planned
feature/player-information-ui     11B    Planned
feature/game-ui-phase-1           11C    Planned
```

## Phase 11A — feature/haunt-content-pack-01

Mission：
建立第一批正式 Scenario，驗證內容生產管線。

驗收標準：
- 新增至少 5 個可遊玩的 Haunt Scenario
- 全部使用既有 Authoring、Bundle、Loader、Runtime 流程
- 不允許為個別劇本修改 Framework
- 每個 Scenario 通過 Scenario Test Harness 與 Regression Test
- 驗證 Information Router、Victory Framework、Scenario Runtime 在不同劇本下皆可正常運作

## Phase 11B — feature/player-information-ui

Mission：
將已完成的 InformationRouter 接到 UI，讓秘密資訊與目標真正被玩家看到。

目標：
- Hero 視角：Objectives、Items、Secrets
- Traitor 視角：Monster HP、Objectives、Special Rules
- Information Visibility 與 Audience Routing 的前端整合

## Phase 11C — feature/game-ui-phase-1

Mission：
完善 Presentation Layer，讓整體遊戲流程可實際遊玩。

目標：
- Turn UI
- Card UI
- Scenario UI
- Victory UI

---

# M12：Multiplayer

Status: Planned（late）

在單機內容與 UI 穩定後，再將既有 Rule Engine 接回多人同步。

現有架構已支援：
- GameState 同步
- ScenarioState 同步
- InformationRouter Audience 同步
- Snapshot Protocol

待 M11 Content Validation 完成後啟動。

---

# 已取消的舊 Milestone

| 舊 Milestone | 原規劃 | 取消原因 |
|---|---|---|
| M9 Multiplayer Server | Socket Layer, Room Mgmt | 延至 M12 |
| M10 Multiplayer Sync | Snapshot Protocol | 延至 M12 |
| M11 Version Platform | Plugin, DLC, Migration | 不需要（本機專案） |
| M11 UI/Animation | UI Layer | 重組為 M11 11B/11C |
