# Phase 9G — Scenario Lifecycle Contract

**Branch**: `feature/scenario-lifecycle-contract`
**Status**: COMPLETE — All tests passing
**Date**: 2026-06-21

---

## Objective

將 ScenarioRuntime 從 `active: boolean` 升級為正式狀態機，解決：

- **TECH-DEBT-025** — Scenario Runtime Lifecycle 尚未標準化
- **TECH-DEBT-027** — Scenario Lifecycle Contract 尚未框架化

---

## 新增檔案 (4)

| 檔案 | 行數 | 用途 |
|------|------|------|
| `src/scenario/lifecycle/ScenarioLifecycleState.js` | 7 | 5 個狀態常數：CREATED / STARTED / PAUSED / COMPLETED / DESTROYED |
| `src/scenario/lifecycle/ScenarioLifecycle.js` | 90 | 狀態機，含轉換驗證、idempotent destroy、`_forceState()` 供 restore 使用 |
| `src/scenario/lifecycle/LifecycleError.js` | 10 | 無效轉換錯誤類別，攜帶 `currentState` + `targetTransition` |
| `src/test/ScenarioLifecycleTest.js` | 683 | 16 個驗收案例 |

## 修改檔案 (9)

| 檔案 | 變更 |
|------|------|
| `src/scenario/runtime/ScenarioRuntime.js` | `#active` → `#lifecycle`；新增 `pause()` / `resume()` / `complete()` / `destroy()` / `getLifecycleState()`；idempotent destroy 保證 router cleanup；snapshot schema 升級為 `lifecycleState`（`restoreFromSnapshot()` 保留 `active` 向後相容） |
| `src/scenario/ScenarioController.js` | `#onTurnChanged()` 在 `emit(SCENARIO_COMPLETED)` 前先呼叫 `runtime.complete()`；`destroy()` 一併清理 `#currentRuntime` |
| `src/testing/scenario/ScenarioTestHarness.js` | `destroy()` 先 `runtime.destroy()` 再 `scenario.destroy()` |
| `src/save/GameSerializer.js` | 儲存條件由 `runtime.isActive` 改為 lifecycleState 檢查（PAUSED / COMPLETED 也可存檔）；寫入 `lifecycleState` 欄位 |
| `src/save/GameSnapshot.js` | 新增 `lifecycleState` 欄位 |
| `src/save/GameDeserializer.js` | 新增 `lifecycleState` 型別驗證 |
| `src/testRunner.js` | Import + 呼叫 `runScenarioLifecycleTest` |
| `src/test/ScenarioRuntimeTest.js` | CASE 3 改驗證 `lifecycleState` |
| `src/test/ScenarioTestHarnessTest.js` | CASE 5 改驗證 `lifecycleState` |

## 未修改

| 檔案 | 原因 |
|------|------|
| `HauntScenario.js` | 基底 Hook 不變 |
| `ScenarioState.js` | Lifecycle 不得混入 Domain State |
| `ScenarioContext.js` | 無關 |
| `ScenarioRuntimeFactory.js` | 工廠邏輯不變 |
| `ScenarioDefinition.js` | 無關 |
| `VictoryController.js` | 僅監聽 SCENARIO_COMPLETED，不受影響 |
| `InformationRouter.js` | `clear()` 已存在，僅呼叫者變更 |

---

## 狀態機合約

```
CREATED
  ↓ start()
STARTED
  ↓ pause()                ↓ resume()
PAUSED ──────────────────→ STARTED
  ↓                        ↓ complete()
  ↓                        ↓ complete()
  ↓ COMPLETED ←────────────┘
  ↓
  ↓ destroy()
DESTROYED (terminal)
```

### 轉換規則

| 方法 | 合法來源 | 禁止來源 |
|------|----------|----------|
| `start()` | CREATED | STARTED / PAUSED / COMPLETED / DESTROYED |
| `pause()` | STARTED | CREATED / PAUSED / COMPLETED / DESTROYED |
| `resume()` | PAUSED | CREATED / STARTED / COMPLETED / DESTROYED |
| `complete()` | STARTED / PAUSED / COMPLETED | CREATED / DESTROYED |
| `destroy()` | 任何狀態 (idempotent) | — |

### 不變量
- DESTROYED 後所有方法（destroy 除外）均 throw LifecycleError
- destroy 永遠安全可重複呼叫
- complete() 在 COMPLETED 狀態下為 no-op

---

## 整合點

### InformationRouter
```
runtime.destroy()
  → router.clear()   (CONSTRAINT-014)
```

### Victory Framework
```
runtime.checkVictory() 回傳結果
  → runtime.complete()
  → EventBus.emit(SCENARIO_COMPLETED)
  → VictoryController emit GAME_ENDED
```

### Save / Load
- Snapshot Schema 升級：`{ scenarioId, lifecycleState, state, information }`
- 新 snapshot 不再寫入 `active` 欄位（由 `lifecycleState` 完全取代）
- `restoreFromSnapshot()` 保留 `active` 向後相容：`active:true → STARTED` / `active:false → CREATED`

---

## 測試結果

所有 16 個 lifecycle 驗收案例 + 15 個既有測試 + Information Router 測試全部通過。

### Lifecycle 驗收案例

| Case | 測試 | 結果 |
|------|------|------|
| 1 | Create Runtime → CREATED | PASS |
| 2 | Start → STARTED | PASS |
| 3 | Pause / Resume | PASS |
| 4 | Invalid: CREATED → Pause throws | PASS |
| 5 | Destroy → DESTROYED | PASS |
| 6 | Destroy idempotent (x3) | PASS |
| 7 | Destroy clears router | PASS |
| 8 | Complete from STARTED | PASS |
| 9 | Complete from PAUSED | PASS |
| 10 | Invalid: Complete from CREATED throws | PASS |
| 11 | Invalid: Complete from DESTROYED throws | PASS |
| 11b | Complete from COMPLETED no-op | PASS |
| 12 | Restore COMPLETED | PASS |
| 13 | Restore DESTROYED | PASS |
| 14 | Backward compat `active:true` → STARTED | PASS |
| 15 | Backward compat `active:false` → CREATED | PASS |
| 16 | `complete()` 在 emit 前被呼叫 | PASS |

---

## 技術債

### 新增

**TECH-DEBT-029 — Lifecycle Missing SUSPENDED State**

未來 Multiplayer 當玩家斷線時可能需要 SUSPENDED 狀態。目前無實作必要，僅記錄占位。檔案：`src/scenario/lifecycle/ScenarioLifecycleState.js`

### 已解決

| 編號 | 描述 | Status |
|------|------|--------|
| TECH-DEBT-025 | Scenario Runtime Lifecycle 尚未標準化 | RESOLVED |
| TECH-DEBT-027 | Scenario Lifecycle Contract 尚未框架化 | RESOLVED |

---

## M6 里程碑

```text
M1  Graph Engine                         ✓
M2  Exploration Loop                     ✓
M3  First Playable Haunt                 ✓
M4  Scenario Test Platform               ✓
M5  Secret Information Layer             ✓
M6  Scenario Lifecycle Contract          ✓  ← NEW
```

### 專案狀態

```text
RULE ENGINE COMPLETE                    ✓
SCENARIO PLATFORM COMPLETE              ✓
SCENARIO TEST PLATFORM COMPLETE         ✓
INFORMATION VISIBILITY COMPLETE         ✓
RUNTIME LIFECYCLE COMPLETE              ✓  ← NEW
```

---

## 下一步建議

### Phase 9H — Scenario Content Contract

```text
feature/scenario-content-contract
```

建立 Scenario Content Governance Pipeline：

```
src/scenario/contracts/
├── ScenarioContract.js
├── ScenarioValidator.js
└── ScenarioSchema.js
```

確保 50+ Haunt Scenarios 的 Metadata / Victory / Information / Lifecycle Hook 全部合法，避免 Scenario Content Explosion。

Phase 10 Multiplayer 應在 Scenario Platform 完全封板後再啟動。
