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
| Local Play Integration    | 100%     |
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

Status: Local Play Complete / M16A Next

## M15 — Local Play Integration

Branch: `feature/local-play-integration`

Status: COMPLETE

Mission:
Connect the existing gameplay platform into a playable local browser flow without adding
new framework layers.

Required normal flow:

```
Create Local Game
Explore
Draw Omen
Haunt Tracker / Roll / Triggered
Runtime Factory
Scenario
PlayerAction
Victory
Restart
```

Result:
The browser entry now starts the local play shell directly. The local session wires the
existing exploration, card, haunt, scenario runtime, presentation, action, victory, and
restart paths into one deterministic local hot-seat flow.

Review rule:

```
Debug start does not replace the normal flow.
Local play integration must not become a new gameplay framework.
Network multiplayer remains out of scope.
```

Follow-up:
Use localhost play observations to choose between UI integration polish and local
multiplayer synchronization. Do not start network multiplayer until the local playable
flow is stable enough to sync.

---

## M15B — Local Play Stabilization & UX Fixes

Branch: `feature/local-play-stabilization`

Status: COMPLETE

Mission:
Harden the M15 local browser prototype into a stable single-browser localhost baseline
before multiplayer work begins.

Result:
Restart lifecycle, stale DOM controls, victory lock, hot-seat private-information refresh,
latest visible card labeling, target selector clarity, and map readability were stabilized
without adding gameplay, framework, content, save/load, or multiplayer capability.

Review rule:

```
Architecture Freeze: maintained
Content Freeze: maintained
Feature Freeze: maintained
```

Stabilization gate:

```
Restart x10
No duplicate dispatch
No stale runtime
No stale DOM
Victory blocks mutation
Hot-seat private information clears on viewer change
Second game remains playable after restart
```

---

## Future Local Multiplayer

僅 localhost，不需要 Authoritative Server、Prediction、Rollback。

```
M15A  Lobby（Create / Join / Leave）
M15B  Action Sync（PlayerAction / Turn / Card Draw / Movement）
M15C  Snapshot Sync（Save / Reconnect / Restore）
```

---

Previous multiplayer numbering is superseded after insertion of M15B stabilization.
Use the following numbering for implementation:

```
M16A  Local Multiplayer Transport Foundation
M16B  Action / Turn Synchronization
M16C  Snapshot Recovery
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

---

# M16A Addendum - Local Multiplayer Transport Foundation

Branch: `feature/local-multiplayer-transport`

Status: COMPLETE

Mission:
Establish the local multiplayer transport contract without adding lobby, room registry,
socket server, reconnect, full guest UI, gameplay rules, scenario framework, or
presentation framework changes.

Authority boundary:

```text
Host Execute
Guest Render
PlayerAction Up
Viewer-safe Projection Down
```

M16A deliverables:

- InMemoryTransport with serialize / deserialize / deliver boundary
- HostTransportGateway
- GuestTransportClient
- MultiplayerProjectionBuilder
- MultiplayerStatePublisher
- createHostGameSession composition wrapper
- createGuestGameSession render-only wrapper
- MultiplayerTransportTest
- Multiplayer transport contract documentation

M16A explicitly defers:

- real socket adapter
- socket server process
- lobby / room registry
- reconnect / resume
- multi-guest routing
- full guest browser UI wiring

Next multiplayer numbering remains:

```text
M16A  Local Multiplayer Transport Foundation
M16B  Action / Turn Synchronization
M16C  Snapshot Recovery
```

---

# M16B Addendum - Action / Turn Synchronization

Branch: `feature/multiplayer-action-turn-sync`

Status: COMPLETE

Mission:
Synchronize fixed player identity, action ownership, action result feedback, pending
action lifecycle, turn-aware projection, and guest projection publishing on top of the
M16A transport contract.

Boundary:

```text
Host Execute
Guest Render
PlayerAction Up
Viewer-safe Projection Down
```

M16B deliverables:

- MultiplayerPlayerBinding
- MultiplayerActionCoordinator
- ACTION_RESULT
- Shared authoritative action adapter
- Guest pending action lifecycle
- Turn-aware projection
- Viewer-safe action whitelist
- Host local accepted action publishes guest projection
- MultiplayerActionTurnSyncTest
- Multiplayer session contract documentation

M16B explicitly defers:

- socket adapter
- lobby / room registry
- reconnect
- authentication
- multi-guest routing
- full guest browser UI
- turn framework rewrite
- gameplay error taxonomy

---

# M16C Addendum - Local Multiplayer Lobby & Socket Transport

Branch: `feature/local-multiplayer-lobby-socket`

Status: IMPLEMENTED - READY FOR REVIEW

Mission:
Add a real localhost socket server, single-room lobby, server-assigned client identity,
host-owned player binding, payload-blind transport relay, and basic disconnect cleanup
while preserving the M16A/M16B authority boundary.

Boundary:

```text
Host Execute
Guest Render
PlayerAction Up
Viewer-safe Projection Down
```

M16C deliverables:

- Local socket server
- Lobby registry and one-host/one-guest room model
- Room code generation
- Lobby / session control / gameplay protocol split
- SocketTransportEndpoint
- LobbyClient
- Socket host / guest session bootstrap
- Trusted sender relay metadata
- Initial projection revision 1
- Active disconnect lifecycle
- MultiplayerLobbyTest
- SocketTransportTest
- MultiplayerSocketIntegrationTest
- Lobby and socket transport contract documentation

M16C explicitly defers:

- reconnect and session resume
- host migration
- multi-guest routing
- persistent lobby storage
- real authentication
- network delivery recovery
- full guest presentation polish

Next milestone:

```text
M16D  Disconnect, Reconnect & Session Recovery
```

---

# M16D Addendum - Reconnect & Session Resume

Branch: `feature/multiplayer-reconnect-session-resume`

Status: IMPLEMENTED - READY FOR REVIEW

Mission:
Allow a temporarily disconnected Guest to recover stable client identity, room
membership, host-owned player binding, and latest viewer-safe projection without
replaying uncertain actions or changing gameplay authority.

M16D deliverables:

- RECONNECTING room state
- reconnect grace reservation
- opaque resume token issue and rotation
- stable clientId recovery across socket replacement
- old socket authority revocation
- RESUME_ROOM / ROOM_RESUMED / RESUME_REJECTED
- PEER_RECONNECTING / PEER_RESUMED
- RESUME_SESSION / SESSION_RESUMED / RESUME_FAILED
- pending action clears with local CONNECTION_LOST
- sequence continuity across reconnect
- one-time recovery baseline revision gate
- latest full projection recovery
- reconnect and resume tests

M16D explicitly defers:

- host reconnect
- host migration
- server restart recovery
- persistent resume token storage
- reliable action delivery
- action/result replay
- projection delta replay
- multi-guest reconnect coordination

---

# M16E Addendum - LAN Multiplayer Playability Hardening

Branch: `feature/lan-multiplayer-playability`

Status: IMPLEMENTED - READY FOR REVIEW

Mission:
Make the existing LAN multiplayer system usable from browser UI without console or
debug helper access. M16E is browser playability, UX integration, and lifecycle
hardening, not multiplayer infrastructure expansion.

M16E deliverables:

- Local / Host LAN / Join LAN entry flow
- Host room creation UI
- Guest join UI
- Room code presentation with optional clipboard copy
- Role, player, current-turn, and status presentation
- Viewer-safe disabled reason presentation
- Reconnect progress and pending-action uncertainty warning
- Explicit guest leave
- Host close room
- New LAN Game as close-and-create-new-room
- Single active app ownership and lifecycle generation guard
- Idempotent destroy and stale callback protection
- LAN multiplayer playability documentation
- M16E focused UI and lifecycle tests

M16E explicitly defers:

- same-room restart
- reliable delivery
- action replay
- projection replay
- page refresh resume
- host reconnect
- host migration
- persistent token storage
- multi-guest
- authentication
- matchmaking
- server gameplay authority

# M16F Addendum - Dedicated Host & Multi-Guest LAN Foundation

Status: ✓ COMPLETE

Mission:

```text
Dedicated Host PC
+ 2-3 Guest player devices
+ one authoritative session
+ per-Guest viewer-safe projections
```

M16F deliverables:

- Fixed 2/3 Guest room player count
- Multi-Guest public roster
- Dedicated Host with no player identity
- Stable guestId separated from connection identity
- Immediate character assignment on QR join; no Ready confirmation step
- Guest-to-Player binding registry
- Per-viewer projection fanout
- Independent Guest reconnect lifecycle
- Persistent device resume token with page-refresh identity recovery
- Live Host PLAYING / RECONNECTING / OFFLINE monitoring
- Active leave terminal reason
- Automatic private LAN IPv4 detection and QR hostname injection
- LAN-accessible Vite development server
- Host switches from QR lobby to the public map stage after session start
- Multi-Guest LAN manual test plan

M16F explicitly defers:

- same-room restart
- mid-game player replacement
- spectators
- AI takeover
- host reconnect or migration
- reliable delivery
- action replay
- projection replay
- internet matchmaking
- authentication
- chat

## M16 Series Closure

Status: ✓ COMPLETE

Final review conclusion:

```text
M16F POST-DEVELOPMENT REPORT: APPROVED
IMPLEMENTATION: COMPLETE
AUTOMATED VALIDATION: PASS
LAN BROWSER FLOW: PASS
PHYSICAL DEVICE VALIDATION: ACCEPTED
REMAINING M16 CODE BLOCKERS: NONE
```

M16 is formally closed. There is no planned M16G.

The completed M16 platform owns:

- Dedicated authoritative Host
- Fixed 2/3-Guest LAN rooms
- LAN IP detection and QR joining
- Stable guestId / connectionId / playerId identity layers
- Per-viewer private projections
- Player binding and action ownership
- Independent Guest reconnect and page-refresh resume
- Host public map mode and live connection monitoring

Future work must extend this platform rather than reopen Lobby, Binding, Reconnect,
or Session foundations without a new verified architectural requirement.

## M17 - Multiplayer Game Experience

### M17A - Shared House Map Experience

Status: COMPLETE

Final post-development report: `docs/M17A_POST_DEVELOPMENT_REPORT.md`

M17A extends the completed M16 platform with one public House Map contract shared by
the Dedicated Host and every Guest:

```text
Authoritative GraphMap
        |
        v
Primitive Map Snapshot
        |
        v
Public Map Projection
        |
        v
HouseMapPresentationModel
        |
        v
Shared HouseMapPanel
```

Completed capabilities:

- Revealed-room coordinates, rotation, and authoritative Graph edges
- Public player markers and current-player highlighting
- Public-only Host projection with no Host viewer identity
- Per-viewer Guest projections containing the same public map
- Latest-map rebuild on reconnect
- Full public-map rendering for Host and focused current-room rendering for mobile Guests

Final product decisions:

- Guest projection retains the complete public map contract; Guest UI defaults to a
  presentation-only focus on the assigned character's current room.
- The LAN root URL opens the Host QR lobby directly. The obsolete ENTRY mode and
  play-mode selection page are not part of the product flow.
- Guest character assignment happens on join without a Ready step, and Active Guest
  UI has no Leave Game control.
- New LAN Game closes the old Room and Session before creating a fresh lobby, QR code,
  player bindings, and character assignments.

M17A therefore fixes both the Shared House Map boundary and the simplified LAN product
entry and Session restart flow.

### Next: M17B - Exploration And Movement Visual Feedback

M17B may improve feedback for already-authoritative exploration and movement. It must
reuse the M17A projection and Panel boundary rather than introduce a client GraphMap,
movement legality, or a second topology model.

M17 uses the completed M16 multiplayer platform. It is not an extension of the M16
foundation milestone.
