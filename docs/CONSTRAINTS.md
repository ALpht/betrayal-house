# Architectural Constraints

Version: 4.0

---

# CONSTRAINT-001

GraphMap 為唯一地圖來源。

禁止：

- roomGrid[][]
- duplicated coordinate cache

---

# CONSTRAINT-002

所有系統透過 EventBus 通訊。

禁止：

controllerA.controllerB()

---

# CONSTRAINT-003

Scenario 必須可序列化。

禁止：

Scenario Instance 持有不可序列化物件。

例如：

- DOM
- EventBus
- Renderer
- Socket

---

# CONSTRAINT-004

Save / Load 為第一級需求。

新增任何 State：

必須支援：

- Save
- Load
- Restore

---

# CONSTRAINT-005

Model 層不得依賴 View。

禁止：

import MapRenderer

---

# CONSTRAINT-006

Controller 不得保存永久狀態。

永久狀態必須存於：

- Model
- State

---

# CONSTRAINT-007

所有 Scenario 必須透過 Registry 註冊。

禁止硬編碼：

if (scenarioId === 1)

---

# CONSTRAINT-008

Multiplayer 為既定目標。

禁止：

window.currentPlayer

等單機專用設計。

---

# CONSTRAINT-009

Card Effect 必須透過 Registry 建立。

禁止：

switch(cardId)

---

# CONSTRAINT-010

任何新增事件必須登記於 EVENT_CATALOG.md

---

# CONSTRAINT-011

Scenario Definition Lifecycle 只能由 Runtime 驅動。

禁止直接呼叫：

```
scenario.start()
scenario.onTurnStart()
scenario.onTurnEnd()
scenario.update()
scenario.checkVictory()
```

---

# CONSTRAINT-012

Scenario Runtime 為 Pure Domain Object。

禁止 Runtime 持有或引用：

- DOM
- Canvas
- Renderer
- EventBus
- Socket

---

# CONSTRAINT-013

所有 Scenario 勝利判定必須透過 VictoryCondition。

禁止直接在 checkVictory() 回傳自定義物件：

```
return true;
return false;
return { completed: true, winner: "..." };
```

VictoryCondition.evaluate() 僅可回傳 VictoryResult 或 null。

---

# CONSTRAINT-014

Scenario Information 不得獨立於 Runtime 存在。

禁止：

```
GameStateManager.informationRouter
ScenarioController.informationRouter
```

允許：

```
ScenarioRuntime.#router
```

生命週期：

```
Runtime Destroy
→ Router Destroy

Runtime Restore
→ Router Restore
```

# CONSTRAINT-015

ScenarioLifecycle 為 Runtime 唯一生命週期來源。

ScenarioRuntime 的生命週期狀態應僅透過 `getLifecycleState()` 查詢。

禁止：

```
runtime.active
runtime.isPaused
runtime.completed
```

平行旗標再次出現。

允許：

```
runtime.getLifecycleState() === "started"
runtime.getLifecycleState() === "paused"
runtime.getLifecycleState() === "completed"
```

---

# CONSTRAINT-016

Scenario Content Layer 不得建立 Runtime Instance。

禁止：

```
new ScenarioRuntime(...)
new InformationRouter(...)
new ScenarioState(...)
```

Content Governance 的責任僅限 Definition Validation 與 Definition Lint。

不得變成 Scenario Sandbox。

---

# CONSTRAINT-017

Validator 必須為 Pure Function。

允許：

```
validate(definition)  →  PASS / ValidationErrorCollection
```

禁止：

```
validate(definition) { registry.register(...) }
validate(definition) { eventBus.emit(...) }
validate(definition) { saveController.save(...) }
```

原因：CI、Build Pipeline、Scenario Pack Import 都需要重複執行 Validator。
必須無 Side Effect。

---

# CONSTRAINT-018

Lint 不得阻止 Scenario 使用。

Lint 永遠：

```
lint(definition) → [{ code, path, message, severity: "warning" }]
```

禁止：

```
throw Error
return false
abort loading
```

Validation = Correctness
Lint = Quality

這是 Content Pipeline 的核心分界。

---

# CONSTRAINT-026

Bundle 不得直接操作 ScenarioRegistry。

唯一合法入口為 BundleLoader → ScenarioLoader。

禁止：

```
bundle.registerDirectly(definition)
bundle.scenarios.forEach(d => registry.register(d))
```

---

# CONSTRAINT-027

Catalog 不得知道 Bundle Loader。

依賴方向：

```
Loader → Registry → Catalog
```

禁止反向依賴：

```
catalog.loadBundle(...)
```

---

# CONSTRAINT-028

Scenario ID 在所有 Bundle 中必須全域唯一。

重複 ID 於 validation 階段報錯，不進入 Registry。

禁止：

```
Bundle A: haunt_01
Bundle B: haunt_01  ← 衝突，拒絕載入
```

---

# CONSTRAINT-029

RuntimeRegistry 為 runtimeClass mapping 的唯一來源。

禁止在 Bundle 中傳遞或宣告 runtimeClass。

ScenarioDescriptor 不得包含任何 Execution 欄位：

```
runtimeClass
runtime
runtimeFactory
controller
state
context
router
victoryCondition
traitorRule
```

---

# CONSTRAINT-030

Bundle Layer 不得依賴 Rule Engine。

禁止 import：

```
ScenarioRuntime
ScenarioController
VictoryCondition
InformationRouter
EventBus
ScenarioDefinition
ScenarioRuntimeFactory
HauntScenario
```

只允許依賴 Content Schema：

```
Descriptor
Manifest
Metadata
Registry
```

---

# CONSTRAINT-031

Scenario 不得依賴其他 Scenario。

禁止：

```
import OtherScenario
new OtherScenario()
registry.get("otherScenario")
```

所有 Scenario 必須透過 Bundle → Definition → Registry 獨立存在。

---

# CONSTRAINT-032

Scenario 不得修改 Framework State。

合法修改僅限：

```
state.set()
state.get()
state.has()
state.remove()
router.route()
```

禁止存取：

```
context.runtime
context.controller
context.eventBus
```

---

# CONSTRAINT-033

Content 必須是 Engine 的 Consumer，而非 Contributor。

允許：

```
extends HauntScenario
extends VictoryCondition
use ScenarioState
use InformationRouter
use ScenarioDefinition
use ScenarioBundle
```

禁止：

```
修改 Engine
修改 Runtime
修改 Infrastructure
修改其他 Content
```

---

# CONSTRAINT-034

PlayerAction 為唯一 Gameplay Input。

Scenario 不得直接接受：

```
UI Event
DOM Event
Keyboard Event
Mouse Event
Network Packet
```

所有 Gameplay Input 必須先轉換為 PlayerAction，再交由 Scenario Runtime 處理。

---

# CONSTRAINT-035

ActionValidator 僅驗證 Action Contract，不得驗證 Gameplay Rule。

ActionValidator 只驗證：

- Action id 是否存在
- Action type 是否為合法 ActionType 值
- playerId 是否為非空字串
- payload 是否可序列化

禁止驗證：

- 玩家是否存活
- 玩家是否在特定房間
- 是否可以對目標執行 Action
- 其他 Gameplay Domain Rule

Gameplay Rule 必須由 Scenario.onAction() 判定。

---

# CONSTRAINT-038

Presentation Layer 不得包含 Gameplay Rule。

UI 只能建立 PlayerAction，不能扣血、判勝、修改 State。

---

# CONSTRAINT-039

Presentation Layer 不得直接操作 ScenarioState。

唯一合法途徑為 PlayerAction → Runtime → Scenario。

---

# CONSTRAINT-040

UI 為 Gameplay Consumer。

流程固定為：

```
UI
    ↓
PlayerAction
    ↓
Runtime
    ↓
Scenario
```

不得反向依賴 Engine。

---

# CONSTRAINT-041

Supported Actions 為 Scenario Capability，不代表目前可執行。

`getSupportedActions()` 表示這個 Scenario 可能會使用哪些 ActionType。
不是玩家現在能不能按。

例如：ClockTower 支援 ATTACK，即使 Boss 已死亡，ATTACK 仍出現在 Supported Actions。
真正送出 Action 後，Scenario 決定 ignore 或正常處理。

