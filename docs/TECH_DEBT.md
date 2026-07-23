# Technical Debt Registry

Version: 4.0

---

## TECH-DEBT-018

Title:
Scenario State 尚未標準化

Priority:
HIGH → RESOLVED

Resolution:
Phase 9C — ScenarioRuntime 建立 ScenarioState 為唯一合法狀態容器。

---

## TECH-DEBT-019

Title:
Scenario Definition Lifecycle Contract 尚未標準化

Priority:
HIGH

Description:

HauntScenario 的五個 Lifecycle Hook（start、onTurnStart、onTurnEnd、update、checkVictory）
已定義基底介面，但缺乏正式規範明確定義各 Hook 的：

- 參數規格
- 回傳值合約
- Context vs State 的責任邊界

這在 Phase 9E Real Haunt Scenarios 開始後，會造成大量 Scenario Authors 實作不一致。

Phase 10A 部分解決：
- ScenarioContract 定義 REQUIRED_LIFECYCLE（start）與 OPTIONAL_LIFECYCLE（onTurnStart, onTurnEnd, update, checkVictory, pause, resume, restore, destroy）
- ScenarioValidator 驗證 start() 必須被 override
- 其餘 Hook 參數規格與 Context vs State 邊界仍需 M8 標準化

---

## TECH-DEBT-020

Title:
Secret Information Routing 缺失

Priority:
HIGH

Description:

目前所有資料皆為公開資訊。

未來需支援：

- Hero View
- Traitor View

---

## TECH-DEBT-021

Title:
Scenario Runtime Context 不完整

Priority:
MEDIUM → RESOLVED

Resolution:
Phase 9C — ScenarioContext 建立為 Read-Only Gateway，提供 players/gameState/graphMap/cardManager。

---

## TECH-DEBT-022

Title:
VictoryCondition Ownership 尚未完全標準化

Priority:
LOW

Description:

Scenario 透過 getVictoryCondition() 描述規則，Runtime 持有 Condition Instance。

未來可評估改為 Runtime 直接持有並呼叫 Condition，簡化 Ownership Chain。

---

## TECH-DEBT-023

Title:
HauntScenario 持有 Runtime State

Priority:
LOW

Description:

HauntScenario 透過 start(context, state) 將 state 暫存於 #state。

未來應改為 checkVictory(context, state) 由 Runtime 傳入，避免 Scenario 持有 Runtime State。

---

## TECH-DEBT-024

Title:
Multiplayer State Synchronization 未實作

Priority:
LOW

Description:

目前 Snapshot 僅供 Save/Load。

未來需支援 Network Snapshot。

---

## TECH-DEBT-028

Title:
Scenario Information Ownership 尚未建立

Priority:
HIGH → RESOLVED

Resolution:
Phase 9F — 建立 InformationRouter 與 InformationAudience 機制，Route 至 scenario 生命週期內。Constraint-014 禁止脫離 Runtime 使用。

---

## TECH-DEBT-029

Title:
Lifecycle Missing SUSPENDED State

Priority:
LOW

Description:
未來 Multiplayer 當玩家斷線時可能需要 SUSPENDED 狀態。
目前無實作必要，僅預留占位。

---

## TECH-DEBT-030

Title:
Scenario Definition version 欄位尚未強制

Priority:
LOW

Description:
Phase 10A 將 metadata.version 設為 Schema optional、Lint warning。
未來 Phase 10C Scenario Package System 時需升級為 required。
此為唯一位移路徑。

---

## TECH-DEBT-038

Title:
event_cold_wind amount 方向未驗證

Priority:
LOW

Description:

EventDefinition `event_cold_wind` 的 `amount: 1` 結合 `stat: 'might'`，
語意上可能是正向 buff（might +1）或負向傷害（should be -1）。

缺乏測試證明其正確意圖。
不修改，等待 Playtest 驗證。

File:
`src/data/EventDefinitions.js` — `event_cold_wind` entry

---

## TECH-DEBT-039

Title:
Real Socket Adapter deferred

Priority:
LOW

Description:
M16A intentionally proves the transport contract with InMemoryTransport only. A real
socket adapter is deferred until the contract, authority boundary, sequence rule, and
viewer-safe projection are stable.

---

## TECH-DEBT-040

Title:
Multi-guest routing deferred

Priority:
LOW

Description:
M16A supports a minimal host/guest flow. Routing multiple guest viewers, per-client
fanout, and room membership are deferred.

---

## TECH-DEBT-041

Title:
Authentication deferred

Priority:
LOW

Description:
M16A uses local sender identity checks only. Authentication and trusted identity
establishment are deferred.

---

## TECH-DEBT-042

Title:
Reconnect deferred

Priority:
LOW

Description:
Reconnect, resume session, host migration, and snapshot recovery are intentionally
deferred to later multiplayer milestones.

---

## TECH-DEBT-043

Title:
Full guest presentation wiring deferred

Priority:
LOW

Description:
M16A guest sessions consume projection state but do not implement full browser UI
wiring. Full guest presentation integration is deferred until the transport foundation
is reviewed.

---

## TECH-DEBT-044

Title:
Real turn legality remains gameplay-owned

Priority:
LOW

Description:
M16B does not add turn validation in multiplayer. Any future stricter turn enforcement
must be implemented or exposed by the existing gameplay pipeline, not by duplicating
TurnManager rules in multiplayer integration.

---

## TECH-DEBT-045

Title:
Action projection target metadata deferred

Priority:
LOW

Description:
M16B intentionally whitelists action projection to type, label, and enabled. Rich target
or option metadata for the current viewer is deferred until a viewer-safe payload
metadata contract exists.

---

## TECH-DEBT-046

Title:
Reconnect and session resume deferred

Priority:
LOW

Description:
M16C closes active rooms on disconnect. Reconnect, missed message replay, session resume,
and recovery after network interruption are deferred.

---

## TECH-DEBT-047

Title:
Host migration deferred

Priority:
LOW

Description:
If the host disconnects, the room closes and guest session is destroyed. Host migration
is intentionally out of scope.

---

## TECH-DEBT-048

Title:
Multi-guest room routing deferred

Priority:
LOW

Description:
M16C supports one host and one guest. Multiple guests, spectators, per-viewer fanout,
and room capacity management are deferred.

---

## TECH-DEBT-049

Title:
Persistent lobby storage deferred

Priority:
LOW

Description:
Room registry is in-memory and process-local. Database storage, durable room codes, and
cross-process room recovery are deferred.

---

## TECH-DEBT-050

Title:
Real authentication deferred

Priority:
LOW

Description:
M16C uses server-assigned local socket client identity. Account login, authentication,
authorization, and internet deployment security are deferred.

---

## TECH-DEBT-051

Title:
Network delivery recovery deferred

Priority:
LOW

Description:
Socket publish failure records connection failure and does not rollback gameplay.
Automatic retry, ack replay, delta recovery, rollback, and guaranteed delivery are
deferred.

---

## TECH-DEBT-052

Title:
Guest full browser presentation deferred

Priority:
LOW

Description:
M16C verifies guest render-only projection flow and minimal browser bootstrap. Full
guest UI polish remains deferred until socket lifecycle is reviewed.

---

## TECH-DEBT-053

Title:
Persistent Resume Tokens

Priority:
LOW

Description:
M16D resume tokens are memory-only and lost on browser refresh or server restart.

---

## TECH-DEBT-054

Title:
Server Restart Session Recovery

Priority:
LOW

Description:
Server restart recovery is deferred. Room registry, token registry, and transport
routing are process-local.

---

## TECH-DEBT-055

Title:
Reliable Action Delivery

Priority:
LOW

Description:
M16D does not retry uncertain actions after disconnect. Reliable delivery and
idempotent action recovery are deferred.

---

## TECH-DEBT-056

Title:
Action Acknowledgement Replay

Priority:
LOW

Description:
Lost ACTION_RESULT replay is deferred. Resume uses latest projection as authoritative
state.

---

## TECH-DEBT-057

Title:
Projection Delta Replay

Priority:
LOW

Description:
Projection queues, deltas, and missed-state replay are deferred. Resume sends one latest
full projection.

---

## TECH-DEBT-058

Title:
Host Reconnect

Priority:
LOW

Description:
Host disconnect remains terminal in M16D. Host recovery and migration are deferred.

---

## TECH-DEBT-059

Title:
Cross-device Identity Authentication

Priority:
LOW

Description:
Resume token proves same in-memory browser participant only. Account authentication and
cross-device recovery are deferred.

---

## TECH-DEBT-060

Title:
Multi-guest Reconnect Coordination

Priority:
LOW

Description:
M16D supports one guest reservation. Multi-guest recovery and per-viewer reconnect
coordination are deferred.

---

## TECH-DEBT-069

Title:
Full visual polish

Priority:
LOW

Description:
M16E focuses on LAN usability and lifecycle stability. Full visual design polish remains
deferred.

---

## TECH-DEBT-070

Title:
Mobile LAN UI

Priority:
LOW

Description:
M16E targets desktop browser LAN play first. Mobile layout polish remains deferred.

---

## TECH-DEBT-071

Title:
Browser refresh resume

Priority:
LOW

Description:
Resume tokens are not persisted across page refresh. Refresh recovery remains deferred.

---

## TECH-DEBT-072

Title:
Persistent user preferences

Priority:
LOW

Description:
Host address, room preferences, and player UI preferences are not persisted.

---

## TECH-DEBT-073

Title:
Multi-guest lobby UI

Priority:
LOW

Description:
M16E keeps the one-host and one-guest baseline. Multi-guest lobby presentation remains
deferred.

---

## TECH-DEBT-074

Title:
Accessibility audit

Priority:
LOW

Description:
M16E uses basic labels, buttons, and readable status text. A fuller accessibility audit
remains deferred.

---

## TECH-DEBT-075

Title:
Automatic reconnect retry policy

Priority:
LOW

Description:
Automatic reconnect timing and UI retry tuning are deferred. This does not imply
reliable action delivery.

---

## TECH-DEBT-076

Title:
Host reconnect UI

Priority:
LOW

Description:
Host disconnect remains terminal. Host reconnect UI remains deferred.

---

## TECH-DEBT-077

Title:
Mobile LAN layout polish

Priority:
LOW

Description:
M16F establishes multi-Guest LAN foundations but does not complete mobile visual polish
for every phone/tablet viewport.

---

## TECH-DEBT-078

Title:
Mid-game player replacement

Priority:
LOW

Description:
Active explicit leave closes the session in M16F. Replacement, AI takeover, and
spectator promotion remain deferred.

---

## TECH-DEBT-079

Title:
Host reconnect and migration

Priority:
LOW

Description:
Dedicated Host remains terminal authority. Host reconnect and host migration are still
out of scope.
