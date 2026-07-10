# Review: Phase 9E-C (Scenario Test Harness)

Version: 4.0

Status: **APPROVED — READY TO MERGE**

---

## 重要性

這個 Branch 的品質比前面幾個 Framework Branch 還重要。

- 9A Scenario Framework — 建立能力
- 9B Traitor Assignment — 建立能力
- 9C Runtime — 建立能力
- 9D Victory — 建立能力
- **9E-C Scenario Test Harness — 建立維護能力**

---

## 評估重點

### 1. 邊界定義正確

最關鍵的決策：**Harness ≠ Game Engine**

文件中明確限制不提供：

- `nextTurn()`
- `movePlayer()`
- `drawCard()`

這避免了半年後 Harness 偷偷長成第二個 Runtime，導致 Runtime Bug 但 Harness Pass 的假陽性測試。

---

### 2. Snapshot 採 Data-Oriented Design

Save System、Replay、Multiplayer 未來都依賴 State Snapshot 而非 Runtime Object Snapshot。

API 設計：

- `capture()`
- `restore()`
- `serialize()`
- `deserialize()`

---

### 3. Isolation Test 做得好

CASE 7 (Multiple Scenario Isolation) 是整個 Branch 最有價值的測試。

未來 50+ Scenarios 時，最容易出現跨污染問題：

```
Scenario A 修改 Runtime
↓
Scenario B 爆炸
```

---

## 目前專案狀態

| Layer              |   狀態 |
| ------------------ | ---: |
| Rule Engine        | 100% |
| Scenario Platform  | 100% |
| Scenario Testing   | 100% |
| Content Pipeline   |  80% |
| Secret Information |   0% |
| Multiplayer        |   0% |
| Presentation Layer |  20% |

---

## 調整後 Roadmap

Phase 9F 不應直接做 Scenario Lifecycle Contract，因為 `pause()` / `resume()` 是 Multiplayer 才需要的能力。

現在最大的架構缺口是 **Secret Information Routing**。Traitor Assigned 已存在，但 Traitor/Hero Perspective 還不存在。

### 新排程

| Phase | 主題 | 優先度 |
| ----- | ---- | ---: |
| 9F | Secret Information Foundation | P0 |
| 9G | Scenario Lifecycle Contract | P1 |
| 10 | Multiplayer Server Foundation | P2 |
| 11 | Multiplayer Synchronization | P2 |
| 12 | UI / Animation | P3 |

### 建議下一個 Branch

```
feature/secret-information-foundation
```

目標：建立 **Information Scope** 概念。

新增：

```
src/scenario/information/
├── InformationScope.js
├── InformationPacket.js
├── InformationRouter.js
└── InformationAudience.js
```

Audience 定義：

```js
TRAITOR_ONLY
HEROES_ONLY
ALL_PLAYERS
OBSERVER
```

此階段只建立 Domain Layer，不做 Socket / Network / Room。

---

## M5 里程碑重新定義

```
M5: Information-Aware Scenario
```

驗收流程：

```
Scenario Started
→ Traitor Assigned
→ Traitor Secret Objective
→ Hero Secret Objective
→ Audience Routing
→ Save
→ Load
→ Continue
```

多人同步真正同步的不是 GameState，而是：

```
GameState
+ ScenarioState
+ Audience Visibility
```
