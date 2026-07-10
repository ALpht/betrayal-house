# Phase 9F — Secret Information Foundation

Branch: `feature/secret-information-foundation`

Status: **IMPLEMENTED — ALL TESTS PASS**

---

## 摘要

建立 Information Routing Layer，為未來 Traitor Objective、Hero Objective、Secret Cards、Multiplayer Visibility 提供 Domain Foundation。

此 Phase 不碰 Socket、不碰 UI、不碰 Multiplayer。只建立資訊可見性模型。

---

## Ownership 架構

```
ScenarioRuntime
 ├─ ScenarioState          (serializable data)
 ├─ InformationRouter     (serializable runtime service)
 └─ Victory Framework
```

- Router 為 Per-Scenario Instance，生命週期與 Runtime 一致
- Scenario 透過 `context.services.get("router")` 存取
- 禁止脫離 Runtime 獨立存在 (CONSTRAINT-014)

---

## 新增檔案 (6 source + 1 test = 587 lines)

| 檔案 | 行數 | 職責 |
|---|---|---|
| `src/scenario/information/InformationAudience.js` | 6 | 角色型 Audience 列舉 (ALL_PLAYERS / HEROES_ONLY / TRAITOR_ONLY / OBSERVERS) |
| `src/scenario/information/InformationScope.js` | 7 | 分類用 Metadata 列舉 (GLOBAL / SCENARIO / OBJECTIVE / CARD / EVENT) |
| `src/scenario/information/InformationPacket.js` | 36 | 可序列化資訊載體，含建構驗證 (id/audience 必填、payload serializable) |
| `src/scenario/information/InformationVisibility.js` | 37 | Audience → PlayerId 解析引擎 |
| `src/scenario/information/InformationRouter.js` | 98 | 核心 Router (route / getVisiblePackets / serialize / deserialize) |
| `src/scenario/services/ScenarioServices.js` | 42 | 可擴充 Runtime Service Registry |
| `src/test/InformationRouterTest.js` | 361 | 7 個測試 Cases |

---

## 修改檔案 (9 files, 73 insertions, 8 deletions)

| 檔案 | 修改內容 |
|---|---|
| `src/scenario/runtime/ScenarioRuntime.js` | 持有 `#router`，`toSnapshot()` / `restoreFromSnapshot()` 擴充 information 欄位 |
| `src/scenario/runtime/ScenarioContext.js` | 新增 `services` getter，注入 ScenarioServices |
| `src/scenario/ScenarioController.js` | 在 `#onTraitorAssigned` 中建立 Router → Services → Context → Runtime |
| `src/scenario/ScenarioRuntimeFactory.js` | `create()` 接受並轉傳 router 參數 |
| `src/save/GameSnapshot.js` | 新增 `scenarioInformation` 欄位 (Option A，向後相容) |
| `src/save/GameSerializer.js` | 序列化 `runtimeSnap.information` → `snapshot.scenarioInformation` |
| `src/save/GameDeserializer.js` | 驗證 `scenarioInformation` 格式 + 回傳供重建 |
| `src/core/EventTypes.js` | 新增 `INFORMATION_ROUTED` (payload 僅含 metadata) |
| `src/testRunner.js` | 註冊 `runInformationRouterTest()` |

---

## Save/Load 流程

```
Save:
  ScenarioRuntime.toSnapshot()
    → { state, information }
  GameSerializer
    → snapshot.scenarioState = state
    → snapshot.scenarioInformation = information

Load:
  GameDeserializer.fromSnapshot()
    → 驗證欄位
  ScenarioRuntime.restoreFromSnapshot({ state, information })
    → state.deserialize(data)
    → router.deserialize(data)
```

---

## 測試結果 (7 Cases, 全部 PASS)

| Case | 驗證 | 斷言數 |
|---|---|---|
| 1 | ALL_PLAYERS 雙方都看見 | 3 |
| 2 | TRAITOR_ONLY 僅叛徒看見 | 3 |
| 3 | HEROES_ONLY 僅英雄看見 | 3 |
| 4 | Serialization round-trip | 4 |
| 5 | Multiple Packets 隔離 | 6 |
| 6 | Restore 不重複 + Duplicate 防護 | 3 |
| 7 | Scenario Isolation (跨 Router 不洩漏) | 4 |

17 個測試套件全數 PASS，exit code 0。

---

## 文件更新

| 文件 | 變更 |
|---|---|
| `docs/CONSTRAINTS.md` | Version 4.0，新增 CONSTRAINT-014 (Scenario Information 不得獨立於 Runtime) |
| `docs/EVENT_CATALOG.md` | 新增 **Information** 分類，登記 INFORMATION_ROUTED |
| `docs/TECH_DEBT.md` | TECH-DEBT-028 → RESOLVED |

---

## Resolved Tech Debt

- **TECH-DEBT-028**: Scenario Information Ownership 尚未建立

---

## 完成後的事件鏈

```
SCENARIO_STARTED
→ Runtime Created
→ Router Created → inject context.services
→ TRAITOR_ASSIGNED
→ Scenario.start()
  → router.route(heroObjective, HEROES_ONLY)
  → router.route(traitorObjective, TRAITOR_ONLY)
→ Runtime Loop
  → getVisiblePackets(heroId)     → 僅看見英雄目標
  → getVisiblePackets(traitorId)  → 僅看見叛徒目標
→ SCENARIO_COMPLETED
→ Router destroyed with Runtime
```

---

## M5 里程碑

```text
Information-Aware Scenario
```

專案成熟度更新：

| Layer | 狀態 |
|---|---|
| Rule Engine | 100% |
| Scenario Platform | 100% |
| Scenario Testing | 100% |
| Information Visibility Layer | **100%** (NEW) |
| Content Pipeline | 80% |
| Multiplayer | 0% |
| Presentation Layer | 20% |

---

## 下一步

```
Phase 9G: feature/scenario-lifecycle-contract
```

標準化 `start()` / `pause()` / `resume()` / `restore()` / `destroy()` 生命週期。
