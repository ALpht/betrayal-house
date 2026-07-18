# Betrayal House Architecture Charter

Version: 4.2
Status: ACTIVE

---

# Purpose

本文件描述專案目前已完成的核心架構。

所有新功能必須建立於此架構之上。

除非發現架構缺陷或 Critical Bug，
否則不得重構本文件列出的核心系統。

---

# Architecture Style

MVC
+
Event Driven Architecture
+
Domain Driven Design
+
Rule Engine
+
Scenario Runtime (Complete — Phase 9C)
+
Victory Framework (Complete — Phase 9D)
+
Scenario Content Governance (Complete — Phase 10A)

---

# Core Systems

## EventBus

Status: COMPLETE

唯一事件交換中心。

所有 Controller 間通訊必須透過 EventBus。

禁止 Controller 直接呼叫 Controller。

---

## GraphMap

Status: COMPLETE

地圖唯一真實來源。

使用 Graph 結構管理房間連結。

禁止建立二維陣列地圖。

---

## Player System

Status: COMPLETE

包含：

- Player
- PlayerStats
- Character Definitions

---

## Exploration System

Status: COMPLETE

包含：

- ExploreController
- MovementController
- TurnManager
- Fog Of War

---

## Card Engine

Status: COMPLETE

包含：

- Card Framework
- Card Registry
- Trigger System
- Effect System

---

## Haunt Foundation

Status: COMPLETE

包含：

- HauntManager
- Haunt Trigger
- Haunt Roll

---

## Scenario Framework

Status: COMPLETE

包含：

- Scenario Base Class
- Scenario Registry
- Scenario Controller

---

## Scenario Runtime

Status: COMPLETE

包含：

- ScenarioRuntime — Pure Domain Object，管理單一 Scenario 執行個體
- ScenarioContext — Read-Only Gateway，提供 Scenario 存取遊戲世界
- ScenarioState — 唯一合法狀態容器，支援序列化

### 核心規則

Scenario Definition Lifecycle 只能由 Runtime 驅動。

禁止直接呼叫：

```
scenario.start()
scenario.update()
scenario.checkVictory()
```

所有 Lifecycle 事件由 ScenarioController 監聽並委託給 Runtime。

### 生命週期

```
TURN_CHANGED
  → ScenarioController
    → runtime.onTurnEnd()
    → runtime.onTurnStart()
    → runtime.update()
    → runtime.checkVictory()
    → SCENARIO_RUNTIME_UPDATED
```

Runtime 不直接 emit EventBus。

---

## Victory Framework

Status: COMPLETE

包含：

- VictoryCondition — 抽象基底，所有 Scenario 勝利判定入口
- VictoryResult — 標準化結果格式 { scenarioId, winner, reason }
- VictoryController — 事件路由：SCENARIO_COMPLETED → GAME_ENDED
- VictoryTypes — WINNER / REASON 常數

### 核心規則

所有 Scenario 勝利判定必須透過 VictoryCondition。

禁止直接回傳：

```
return true;
return false;
return { completed: true, winner: "..." };
```

### 勝利流程

```
SCENARIO_COMPLETED
  → VictoryController
    → new VictoryResult({ scenarioId, winner, reason })
    → EventBus.emit(GAME_ENDED, payload)
```

### Restore 行為

VictoryController.restore() 僅恢復 VictoryResult，不重新發送 GAME_ENDED。

### 事件鏈（完整）

```
Explore
↓
Omen
↓
Haunt Roll
↓
HAUNT_TRIGGERED
↓
SCENARIO_STARTED
↓
TRAITOR_ASSIGNED
↓
SCENARIO_RUNTIME_CREATED
↓
TURN_CHANGED
↓
Runtime Lifecycle
  → onTurnEnd()
  → onTurnStart()
  → update()
  → checkVictory()
    → VictoryCondition.evaluate(context, state)
    → VictoryResult.heroes() / .traitor()
↓
SCENARIO_COMPLETED
↓
VictoryController
↓
GAME_ENDED
```

---

## Traitor Assignment

Status: COMPLETE

包含：

- Assignment Controller
- Assignment Events

---

## Save System

Status: COMPLETE

包含：

- Snapshot Creation
- Snapshot Validation
- Restore Process

---

## Scenario Content Governance

Status: COMPLETE — Phase 10A

包含：

- ScenarioContract — 合約常數定義（metadata、lifecycle、audience、traitorRule 等規格）
- ScenarioSchema — 欄位 Schema，定義必填/可選/型別/格式限制
- ScenarioValidator — validate(definition) 與 validateAll(definitions)，Pure Function，無 Side Effect
- ScenarioLint — lint(definition) 回傳 warnings，不拋錯、不阻擋執行
- ValidationError / ValidationErrorCollection — 自訂 Error，攜帶 code + path + message

### 核心規則

Content Governance 層僅限 Definition 驗證，不得建立 Runtime Instance。

```
禁止：
  new ScenarioRuntime(...)
  new InformationRouter(...)
  new ScenarioState(...)
```

Validator 必須為 Pure Function：

```
允許：
  validate(definition)

禁止：
  validate(definition) { registry.register(...) }
  validate(definition) { eventBus.emit(...) }
  validate(definition) { saveController.save(...) }
```

Lint 永不阻擋 Scenario 使用：

```
允許：
  lint(definition) → [{ code, path, message, severity: "warning" }]

禁止：
  throw Error
  return false
  abort loading
```

### 驗證流程

```
Scenario Definition
  ↓
ScenarioValidator.validate()
  ↓
PASS / ValidationErrorCollection

Scenario Definition
  ↓
ScenarioLint.lint()
  ↓
Warnings[]
```

### 批量驗證

```
validateAll([def1, def2, ..., def50])
  ↓
PASS / ValidationErrorCollection(allErrors)
```

一次回報所有錯誤，無需逐個修復。

---

# Architecture Goal

目前專案目標：

Author
↓
Scenario Definition
↓
Scenario Content Governance (Phase 10A — Complete)
↓
Scenario Platform
↓
Runtime
↓
Victory
↓
Game End

---

---

# M16A Multiplayer Transport Boundary

M16A adds a transport boundary beside local play. It does not change the gameplay
platform.

```text
Guest Render Session
    |
    | PLAYER_ACTION
    v
Transport Boundary
    |
    v
HostTransportGateway
    |
    v
Existing LocalGameSession / PlayerAction Pipeline
    |
    v
MultiplayerProjectionBuilder
    |
    | viewer-safe STATE_UPDATED
    v
Guest Render Session
```

Rules:

- Host is the only gameplay authority.
- Guest does not own runtime, controllers, validators, victory, card, or scenario state.
- Transport validates envelope, session, identity, sequence, and serialization only.
- Existing ActionValidator remains the gameplay action contract validator.
- Visibility filtering happens before transport.
- Transport messages are not gameplay EventBus events.

Contract details live in `docs/MULTIPLAYER_TRANSPORT_CONTRACT.md`.

---

# M16B Multiplayer Session Boundary

M16B adds session-level synchronization above transport and below gameplay.

```text
HostTransportGateway
    |
    | transport message shape / session
    v
MultiplayerActionCoordinator
    |
    | binding / ownership / sequence / action result
    v
AuthoritativeActionExecutor
    |
    | existing local gameplay pipeline
    v
MultiplayerProjectionBuilder
    |
    | viewer-safe turn/action projection
    v
GuestTransportClient
```

Responsibilities:

- Transport validates message shape and session.
- Multiplayer integration validates fixed client identity, player ownership, and sequence.
- Gameplay owns action legality, turn legality, and state mutation.
- Projection converts host state into viewer-safe UI data.

Session details live in `docs/MULTIPLAYER_SESSION_CONTRACT.md`.
