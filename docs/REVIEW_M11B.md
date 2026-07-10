# M11B — Gameplay Action Foundation

Version: 1.0
Status: COMPLETE

---

## Mission

建立 Scenario 與玩家行為之間的正式互動模型，讓 Scenario 從「可驗證的規則模型」升級為「可透過 PlayerAction 驅動的 Gameplay Domain」。

---

## What Was Built

### Action Layer（5 new files）

```
src/scenario/action/
├── ActionType.js              — 8 個 action 常數（MOVE/INTERACT/COLLECT/ATTACK/DESTROY/ACTIVATE/USE_ITEM/END_TURN）
├── PlayerAction.js            — 不可變 Value Object（id, type, playerId, payload）
├── ActionValidator.js          — Contract-only 驗證（type, id, playerId, serializable）
└── ScenarioActionHandler.js   — dispatch(runtime, action) → validate + handleAction，不回傳 victory
```

### Framework Extension Points（3 modified files）

| File | Change | Lines |
|------|--------|-------|
| `HauntScenario.js` | +`onAction(action, context, state)` no-op | +2 |
| `ScenarioRuntime.js` | +`handleAction(action)` → delegate | +4 |
| `ScenarioState.js` | +`increment(key, amount=1)` | +6 |

### Content：PuppetMaster now uses Action（1 modified file）

`PuppetMasterScenario.js` — `onAction` handles DESTROY → `state.increment("dollsDestroyed")`

### Architecture Governance（2 constraints added）

- **CONSTRAINT-034** — PlayerAction 為唯一 Gameplay Input
- **CONSTRAINT-035** — ActionValidator 僅驗證 Action Contract，不得驗證 Gameplay Rule

---

## Design Decisions

### 1. ActionContext 暫緩建立

`roomId` / `targetId` / `timestamp` 直接放進 `action.payload`，不需第二套 Context。

### 2. PlayerAction.id 由外部傳入

保持 Value Object 純粹，不內建 `nextId()`。Replay、Regression、Multiplayer 各自決定 ID。

### 3. ScenarioActionHandler.dispatch() 不回傳 victory

Victory 由 Controller / Game Loop 控制，Action handler 只負責驗證 + 執行。

### 4. ActionValidator 不碰 Domain Rule

不驗 isAlive、不驗位置、不驗可不可攻擊。只驗 Action 本身的 Contract（型別、ID、序列化性）。

---

## Test Results

### New: GameplayActionTest — 28/28 passed

| # | Case | Verifies |
|---|------|----------|
| 1 | Action updates state | DESTROY → dollsDestroyed 0→1 |
| 2 | Sequence → Victory | 3 DESTROY → dollsDestroyed=3 → HeroWin |
| 3 | Invalid action rejected | Validator 拒絕 null/empty/invalid type |
| 4 | Unhandled action ignored | INTERACT → 無變化 |
| 5 | Snapshot → Restore | state 正確還原 |
| 6 | Restore → Continue → Victory | Snapshot 後繼續 action → HeroWin |
| 7 | Multi-runtime isolation | 兩個 runtime 互不汙染 |

### Existing: All 9 scenario test suites — 0 failures

| Suite | Results |
|-------|---------|
| ScenarioFrameworkTest | 11/11 passed |
| ScenarioRuntimeTest | 22/22 passed |
| EscapeTheHouseTest | 27/27 passed |
| ScenarioTestHarnessTest | 26/26 passed |
| InformationRouterTest | 29/29 passed |
| ScenarioLifecycleTest | 46/46 passed |
| ScenarioContractTest | 29/29 passed |
| ScenarioBatchRegressionTest | 8/8 passed |
| ScenarioBundleTest | 48/48 passed |
| HauntContentPack01Test | 85/85 passed |

---

## Flow Now Supports

```
PlayerAction
        ↓
ScenarioActionHandler.dispatch()
        ↓
ActionValidator.validate()
        ↓
ScenarioRuntime.handleAction()
        ↓
Scenario.onAction()
        ↓
ScenarioState updated
        ↓
Snapshot
        ↓
Restore
        ↓
Continue Action
        ↓
VictoryCondition
```

---

## What Was NOT Changed

- ScenarioRuntimeFactory
- ScenarioController（仍由 #onTurnChanged 驅動）
- InformationRouter
- Bundle / Registry / Loader system
- Save / Load（GameSerializer/GameDeserializer）
- Regression infrastructure
- All other 4 haunts（HungryHouse, BoundSpirits, ClockTower, RitualOfShadows）

---

## M11B Exclusions（明確不包含）

| Item | Reason | ETA |
|------|--------|-----|
| ActionContext.js | payload 可涵蓋 | Until runtime metadata needed |
| Other 4 haunts action migration | Scope control | M11C |
| ScenarioController action routing | No UI yet | When UI integrated |
| Automatic checkVictory on action | Controller responsibility | N/A |
| Action-based regression runner | Covered by test case 6 | If regression needs it |

---

## Next: M11C — Gameplay Expansion

在 Framework 零修改的前提下，逐步將剩下 4 個 Scenario 從 `state.set()` 遷移至 `onAction()`：

| Scenario | Action | Effect |
|----------|--------|--------|
| HungryHouse | MOVE | 更新位置、進入安全室 |
| ClockTower | ATTACK / COLLECT | 扣 Boss HP / 增加零件數 |
| BoundSpirits | INTERACT / ATTACK | 護送進度 / Spirit 死亡 |
| RitualOfShadows | ACTIVATE | 啟動祭壇 |
