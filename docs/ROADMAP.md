# Roadmap

Version: 7.0

---

# 專案成熟度

| Layer                     | 狀態     |
| ------------------------- | -------- |
| Graph Engine              | 100% ✓   |
| Gameplay Action Pipeline  | 100% ✓   |
| Scenario Runtime          | 100% ✓   |
| Scenario Framework        | 100% ✓   |
| Scenario Authoring        | 100% ✓   |
| Scenario Packaging        | 100% ✓   |
| Scenario Testing          | 100% ✓   |
| Content Governance        | 100% ✓   |
| Secret Information        | 100% ✓   |
| Victory Framework         | 100% ✓   |
| Regression Testing        | 100% ✓   |
| Save / Load               | 100% ✓   |
| Presentation Layer        | 100% ✓   |
| Content Expansion         | 60%      |
| Local Multiplayer         | 0%       |

---

# Phase 1 — Platform Construction

Status: ✓ COMPLETE

## M1 ~ M10

建立可長期維護的 Gameplay Platform。

完成：

```
Graph Engine
Explore
Card System
Scenario Runtime
Rule Engine
Lifecycle
Save/Load
Testing
Packaging
Governance
```

---

# Phase 2 — Gameplay Foundation

Status: ✓ COMPLETE

## M11

```
M11A  Haunt Content Pack 01（5 Scenarios）    ✓
M11B  Gameplay Action System                   ✓
M11C  Gameplay Behavior Validation             ✓
```

驗證 Scenario Platform 能支撐多個內容差異化、互不耦合的正式 Scenario。
所有 Scenario 透過既有 Authoring → Bundle → Loader → Runtime 流程建立，Framework 零修改。

---

# Phase 3 — Presentation Layer

Status: ✓ COMPLETE

```
M13A  Presentation Controller Foundation      ✓
M13B  Turn Presentation                       ✓
M13C  Scenario & Victory Presentation         ✓
M13D  Card Presentation                       ✓
M13E  Character Presentation                  ✓
```

四種不同 Domain（Turn、Scenario/Victory、Card、Character）皆已成功接入同一套 Presentation Architecture。
Presentation Framework 已被充分驗證，不再新增。

---

# Phase 4 — Content Expansion

Status: Current

## M14A — Core Content Pack

Branch: `feature/core-content-pack-01`

Status: ✓ COMPLETE

Mission:
建立第一個完整可遊玩的 Content Pack，驗證既有平台足以支撐實際遊戲內容。

包含：

```
Event Cards
Item Cards
Omen Cards
Characters
Room Content Review
```

驗收標準：
至少包含上述五種內容類型。若在開發中發現某類內容已足夠支撐遊戲，可提前結束，不以固定數量為唯一驗收標準。

Room Content Review：
驗證 Trigger Distribution、Room Balance、Dead End、Exploration Flow。
必要時新增 Safe Room、Utility Room、Neutral Room。

不包含：
Framework 修改、Runtime 修改、新 Effect Registry、UI 變更。

---

## M14B — Haunt Pack

Branch: `feature/playable-scenario-pack-01`

Status: COMPLETE

Mission:
Use the existing Cards, Characters, Rooms, Actions, Scenario Runtime, Victory Framework,
Information Router, Bundle system, and test harness to create five complete playable
scenarios. M14B is a game design/content milestone, not a framework milestone.

Scenarios:

```
Relic Escape       Collection / Escape
The Ashen Titan    Boss / Anchor Destroy
The Lost Heir      Escort / Protect NPC
The Sealed Gallery Puzzle / Ordered Activation
The Masked Host    Hidden Information / Traitor Objective
```

Review rule:

```
Framework Modified = 0
```

No new Runtime API, Scenario Framework API, Victory Framework API, Rule Engine,
Presentation API, ActionType, ScenarioActionHandler, or ActionValidator change is allowed.

Legacy note:
The older Haunt Pack mission text below is superseded by Playable Scenario Pack 01.

Mission:
新增 8~12 個 Scenario，使用既有 Authoring → Bundle → Loader → Runtime 流程，Framework 零修改。

類型分佈：

```
Collection    2–3
Survival      2–3
Escort        1–2
Boss Fight    1–2
Puzzle        1–2
Escape        1–2
```

每個 Scenario 需通過 Scenario Test Harness 與 Regression Test。

---

## M14C — Playtest & Balance

Branch: `feature/playtest-balance-01`

Status: COMPLETE

Mission:
Use the existing content and five playable scenarios to run repeatable deterministic
playtest samples, identify structural pacing and clarity problems, and apply only
evidence-backed scenario-owned adjustments.

Focus:

```
Scenario balance baseline
Hero / traitor victory reachability
Timeout boundaries
Action availability clarity
Snapshot / restore consistency
Hidden information isolation
Human playtest risks
```

Result:
Baseline balance was established across all five playable scenarios. The only
evidence-backed content adjustment was made to `lostHeir`, changing NPC defeat
from one traitor attack to two scenario-owned wounds. No platform framework was
expanded.

Framework changes remain blocked unless approved as a separate architecture exception.

Legacy note:
The older Game Polish text below is superseded by Playtest & Balance.

Mission:
讓遊戲「好玩」。

包含：

```
Playtest
Balance
Bug Fix
UX
Flow
```

不包含：
Framework 變更、新增抽象層、重構。

---

# Phase 5 — Local Multiplayer

Status: Planned

僅 localhost，不需要 Authoritative Server、Prediction、Rollback。

```
M15A  Lobby（Create / Join / Leave）
M15B  Action Sync（PlayerAction / Turn / Card Draw / Movement）
M15C  Snapshot Sync（Save / Reconnect / Restore）
```

---

# Architecture

```
        Player
           │
           ▼
      PlayerAction
           │
           ▼
    Scenario Runtime
           │
     ┌─────┴─────┐
     ▼           ▼
Presentation  Save / Load
     │
     ▼
PresentationController
     │
┌────┼──────────────────────┐
▼    ▼          ▼           ▼
Turn Card     Scenario   Character
Panel Panel     Panel      Panel
```

所有 Feature 都掛在這個架構上。不再新增新的 Layer。

---

# Architecture Freeze

自 M13E 起，以下基礎架構視為穩定：

- Graph Engine
- Gameplay Action Pipeline
- Scenario Runtime
- Scenario Framework
- Rule Engine
- Victory Framework
- Information Router
- Presentation Adapter / Query / Controller
- Save / Load

除非遇到明確缺陷（Bug）或新需求無法以現有架構實現，否則：

- 不新增新的 Framework Layer。
- 不新增新的抽象（Abstract Layer）。
- 不重新設計 Runtime。
- 不重寫既有平台。

Architecture Freeze 並非禁止改善，而是：

```
Architecture Changes  =  Exception
Feature Changes       =  Default
```

Framework 穩定性優先於架構完美性。

新增功能應優先以擴充 Query、Model、Panel、Scenario 或 Content 的方式完成。

---

# Milestone 審查標準

每個新 Milestone 都先回答四個問題：

1. **這個功能是新增內容（Feature）還是新增架構（Framework）？**

   若是 Framework，必須證明現有架構無法支援。

2. **是否可以透過既有的 Query、PresentationModel、Panel 或 Scenario 擴充完成？**

3. **是否修改了 Runtime、Rule Engine、Scenario Framework？**

   若有，需提出充分理由。

4. **是否讓遊戲更完整、更好玩？**

   若否，且不影響可玩性，則不納入 Milestone。

---

# Project Position

自 Phase 4 起，專案從「Architecture Project」正式轉為「Game Project」。

平台開發已告一段落，後續以內容、遊戲體驗與維護性為主要目標。

每個 Milestone 必須回答：

> **它是否讓遊戲更完整、更好玩？**

---

# Future Ideas（非 Milestone）

以下功能有潛力但未排程：

```
Achievements
Statistics
Replay
Replay Viewer
AI Player
Localization
Sound
Animation
```

狀態：Not Scheduled。
不列入 Milestone，也不作為開發承諾。

---

# Branch Policy

所有新 Branch 分為三類：

```
Framework（原則上禁止）
Feature（預設）
Content（預設）
```

- **Framework Branch**：僅在 Architecture Freeze 例外情況下建立。
- **Feature Branch**：新增遊戲功能，不修改平台。
- **Content Branch**：新增卡牌、角色、劇本、房間等資料內容。

---

# 已取消的舊 Milestone

| 舊 Milestone | 原規劃 | 取消原因 |
|---|---|---|
| M9 Multiplayer Server | Socket Layer, Room Mgmt | 併入 Phase 5 |
| M10 Multiplayer Sync | Snapshot Protocol | 併入 Phase 5 |
| M11 Version Platform | Plugin, DLC, Migration | 不需要（本機專案） |
| M11 UI/Animation | UI Layer | 重組為 Phase 3 |
| M14 Multiplayer Synchronization | 原 M14 | 重編為 Phase 5 |
| M12 Content Expansion | 原 M12 | 重編為 Phase 4 |
| M14A Card UI | Card Presentation | 已完成（M13D） |
| M14B Player Info | Character Presentation | 已完成（M13E） |
| M14C UI Polish | UI Polish | 改為 Continuous Improvement |
