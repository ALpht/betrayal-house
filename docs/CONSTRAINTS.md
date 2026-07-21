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

---

# CONSTRAINT-043

Presentation Query Layer 不得推導 Gameplay Rule。

只能：
- Read
- Transform
- Present

不能：
- Infer
- Validate
- Judge
- Execute

---

# CONSTRAINT-044

Presentation Component 不得依賴 Runtime。

只能依賴：
- PresentationModel

---

# CONSTRAINT-048

Presentation Query 必須遵守 Information Visibility，
不得繞過 InformationRouter 直接取得玩家不可見資料。

禁止：

```
router.getAllPackets() 直接用於 PresentationModel
ScenarioState 直接暴露給 PresentationModel
Presentation 自行推導 Hidden Information
```

例如：

```
禁止 Boss HP == 0 → 推論玩家知道 Boss 已死亡
Presentation 必須相信 InformationRouter
```

允許：

```
router.getVisiblePackets(playerId, traitorPlayerId)
runtime.getScenarioMetadata()（非秘密資訊）
runtime.getVictoryResult()（由 Runtime 公開的唯讀介面）
```


---

# CONSTRAINT-049

Host Authority

The host is the only gameplay authority in multiplayer transport. Guest clients must
not own or mutate Gameplay Runtime, Scenario Controller, Victory Controller, or
ScenarioActionHandler state.

---

# CONSTRAINT-050

Guest Render Only

Guest sessions may connect, send PlayerAction messages, receive viewer-safe state, and
render projection data. They must not validate gameplay rules or execute gameplay.

---

# CONSTRAINT-051

PlayerAction Transport Reuse

Network transport must reuse the existing PlayerAction domain contract. Do not create
NetworkAction, RemoteAction, SocketAction, or MultiplayerAction.

---

# CONSTRAINT-052

Transport Blind to Gameplay

Transport may validate envelope shape, session, identity, sequence, serialization, and
message type. It must not decide action legality, victory, scenario progress, or rule
outcomes.

---

# CONSTRAINT-053

Visibility Before Transport

Host must filter information for the target viewer before sending state. Do not send a
full InformationRouter snapshot or private scenario state to the guest for client-side
filtering.

---

# CONSTRAINT-054

No Platform Modification

M16A multiplayer transport must not modify ScenarioRuntime, Scenario Framework,
Victory Framework, InformationRouter, ActionType, ActionValidator,
ScenarioActionHandler, GraphMap, Save / Load core, Bundle System, scenario content, or
scenario definition contracts.

---

# CONSTRAINT-055

Fixed Player Binding

Each multiplayer client must have exactly one fixed playerId and viewerId in M16B.
Action payloads must not be allowed to choose a different player identity.

---

# CONSTRAINT-056

Ownership Before Gameplay

Multiplayer identity and action ownership checks must pass before a remote action enters
the gameplay pipeline.

---

# CONSTRAINT-057

Turn Rules Remain Gameplay-owned

The multiplayer layer must not implement TurnManager rules or decide turn legality.
Turn legality belongs to the existing gameplay pipeline.

---

# CONSTRAINT-058

Projection-owned Guest UI

Guest UI state must be derived from host-provided viewer-safe projection. Guest code must
not query Gameplay Runtime or presentation query/model/panel core.

---

# CONSTRAINT-059

Single Authoritative Action Path

Host local actions and guest remote actions must share the same authoritative gameplay
execution adapter. Source metadata must not alter gameplay behavior.

---

# CONSTRAINT-060

Action Result Is Non-domain

ACTION_RESULT is multiplayer delivery feedback. It must not become a gameplay EventBus
event, scenario rule contract, or domain outcome taxonomy.

---

# CONSTRAINT-061

Server Is Not Gameplay Authority

The M16C socket server owns connection, lobby, routing, and lifecycle metadata only. It
must not import or own ScenarioRuntime, ActionValidator, TurnManager,
ScenarioActionHandler, VictoryEvaluator, projection builder, save/load state, game
snapshots, or InformationRouter internals.

---

# CONSTRAINT-062

Socket Adapter Reuses Transport Contract

Socket transport must use the existing transport envelope and `TransportSerializer`.
Do not create SocketPlayerAction, NetworkActionResult, RemoteStateSnapshot, or a second
gameplay transport protocol.

---

# CONSTRAINT-063

Connection Identity Is Server-owned

Socket `clientId` and role are assigned by the server. Client-provided sender identity
is not trusted. Trusted sender source is socket connection metadata relayed to host.

---

# CONSTRAINT-064

Lobby State Is Not Game State

Lobby rooms may store room identity, room code, client membership, role, status, and
sessionId. Lobby rooms must not store runtime, graph, player domain objects, action
history, projection history, snapshot, victory, scenario state, or router data.

---

# CONSTRAINT-065

Gameplay Relay Is Payload-blind

Server may inspect transport metadata required for identity, direction enforcement,
session validation, and routing. Server must not interpret or mutate gameplay payload
content.

---

# CONSTRAINT-066

Disconnect Does Not Mutate Gameplay

Socket disconnect closes lobby/session lifecycle according to room state. It must not
alter scenario state, player state, turn state, victory state, or save/load state.

---

# CONSTRAINT-067

One Client One Room / One Host One Guest

M16C supports one host and one guest per room. A socket client may belong to at most
one room. Multi-guest routing, spectators, host election, and host migration are
deferred.

---

# CONSTRAINT-068

Room and Session Identities Are Separate

`roomId`, `roomCode`, and `sessionId` have different meanings and must remain distinct.
Lobby lookup uses `roomId` / `roomCode`; gameplay transport routing uses `sessionId`.

---

# CONSTRAINT-069

Resume Restores Connection, Not Gameplay

Reconnect may recover connection identity, room membership, binding, and projection. It
must not reconstruct or mutate gameplay state outside the host runtime.

---

# CONSTRAINT-070

Resume Token Is Server-owned

Resume identity must be validated against server-held opaque token state. Client-supplied
identity fields are not trusted.

---

# CONSTRAINT-071

Host Remains Binding Authority After Resume

Server may restore client membership, but host must reissue the existing player binding
before guest gameplay resumes.

---

# CONSTRAINT-072

No Automatic Action Replay

Actions with uncertain delivery status must not be retried automatically after reconnect.

---

# CONSTRAINT-073

Sequence State Survives Reconnect

Sequence allocation and duplicate-consumption state must survive socket replacement.
Pending-action cleanup must never reuse an uncertain sequence.

---

# CONSTRAINT-074

Resume Uses Latest Full Projection

Recovery must use one newly built latest viewer-safe projection. Server and guest must
not retain runtime snapshot, event log, projection replay queue, or missed gameplay
message queue.

---

# CONSTRAINT-075

Host Disconnect Is Terminal

M16D does not support host reconnect or host migration. Host disconnect closes the
transport session.

---

# CONSTRAINT-076

Reconnect Timers Have Explicit Ownership

Reconnect timers must be cancellable, cleared during resume, closure and server stop,
and must not remain as open handles.

---

# CONSTRAINT-077

Multiplayer UI Is Not Gameplay Authority

Multiplayer UI must not decide gameplay legality, query runtime internals, or mutate
session lifecycle. It renders derived state from lobby, transport, session, and
viewer-safe projection sources.

---

# CONSTRAINT-078

Disabled State Must Be Explainable

Disabled multiplayer actions must show a viewer-safe reason. UI must not leave a
disabled action unexplained.

---

# CONSTRAINT-079

Socket Ownership Belongs to Bootstrap

Panels and presentation components must not own Socket.io clients, LobbyClient,
SocketTransportEndpoint, or multiplayer sessions. Bootstrap owns these external effects.

---

# CONSTRAINT-080

Reconnect Never Replays PlayerAction

Reconnect UI must never automatically replay an uncertain PlayerAction, roll back
sequence state, or perform action-result reconciliation.

---

# CONSTRAINT-081

Destroy Removes All External Effects

Multiplayer app, controller, and panel destroy paths must remove DOM listeners, socket
listeners, transport subscriptions, session subscriptions, timers, and late callback
authority. Destroy must be idempotent.

---

# CONSTRAINT-082

UI Uses Viewer-safe State Only

Guest UI must not receive runtime objects, raw snapshots, InformationRouter internals,
raw transport envelopes, resume tokens, socket ids, or internal client ids.

---

# CONSTRAINT-083

Multiplayer Infrastructure Expansion Requires Observed Blocker

New protocol, delivery state, or network framework work requires an observed LAN
playability blocker. The default M16E fix is UI or lifecycle hardening.
