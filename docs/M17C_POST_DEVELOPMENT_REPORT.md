# M17C 開發後報告

Milestone：M17C — Exploration Gameplay Rules

Branch：`feature/exploration-gameplay-rules`

報告日期：2026-07-26

實作狀態：**COMPLETE**

驗證狀態：**AUTOMATED PASS / PHYSICAL LAN PENDING**

## 1. 開發目標

M17C 將專案從多人探索畫面推進到 Host-authoritative 的核心探索規則：

```text
PlayerAction
        ↓
AuthoritativeGameplayActionRouter
        ├── EXPLORATION → ExplorationActionHandler
        └── HAUNT       → existing ScenarioActionHandler
        ↓
GraphMap / TileDeck / Player / Turn
        ↓
Projection
        ↓
Host / Guest UI
```

本里程碑實作第三版的「核心方向探索循環」，不宣稱完成全部第三版房間放置規則。

完成後，玩家的方向操作不再只是移動 marker，而是由 Host 判斷：

- 是否有牆。
- 是否已有合法相鄰房間。
- 是否為尚未探索的方向。
- 是否被已存在但未連接的房間阻擋。
- 牌堆是否存在可合法旋轉及放置的 Tile。

Guest 只送出正式 `PlayerAction` 並呈現 Projection，不持有或推導探索規則。

## 2. 核心實作

### 2.1 Phase-aware Gameplay Router

新增 `AuthoritativeGameplayActionRouter`，以 `GameStateManager` 的 phase 選擇處理流程：

```text
EXPLORATION + Runtime null
→ ExplorationActionHandler

HAUNT + Runtime exists
→ existing ScenarioActionHandler
```

非法 phase／Runtime 組合會明確拒絕，不 fallback 到另一條 action pipeline。

權威執行結果統一為：

```js
{
  accepted,
  reasonCode,
  stateChanged,
  shouldPublish
}
```

探索成功時發布一次，拒絕時不發布；Haunt action 維持既有 accepted-action publication semantics。

### 2.2 Canonical PlayerAction Entry

Local Play、Multiplayer Guest 與相容 wrapper 共用同一入口：

```text
ActionFactory
→ PlayerAction
→ executeAuthoritativeAction
→ Gameplay Router
```

方向移動沿用：

```js
{
  type: "MOVE",
  payload: { direction }
}
```

未新增方向專用 ActionType。

`session.move(direction)` 只負責建立正式 PlayerAction，不直接呼叫探索規則。

### 2.3 Pure Exploration Placement Planner

新增無狀態 `ExplorationPlacementPlanner`。

Planner：

- 查看 ordered Tile snapshots。
- 對候選 Tile 嘗試四種 rotation。
- 選擇第一張能與探索來源門相接的 Tile。
- 回傳 Tile ID、index、rotation、target coordinate 與 deck version。
- 不修改 TileDeck、GraphMap、Player 或 TurnManager。
- 不 consume random。
- 不 emit Event。

Availability 與 action execution 共用同一 Planner，避免 UI 顯示 enabled、實際執行卻因另一套 rotation 規則失敗。

### 2.4 TileDeck Read／Commit Contract

`TileDeck` 現在支援：

```js
new TileDeck(definitions, {
  random: Math.random
})
```

新增：

```js
getRemainingTiles()
getVersion()
commitPlannedDraw({
  selectedTileId,
  selectedTileIndex,
  expectedVersion
})
```

`getRemainingTiles()` 回傳 frozen cloned snapshots，不暴露牌堆內部 mutable array。

`commitPlannedDraw()` 在 mutation 前驗證：

- deck version。
- Tile index。
- Tile ID。

成功後一次產生新牌堆順序：

```text
remaining tiles
→ skipped leading tiles
```

全牌堆無合法 Tile 時，牌序、地圖、玩家、回合、事件及 Projection revision 均不變。

### 2.5 Direction Topology

M17C 固定四種內部拓撲：

```text
CONNECTED
UNKNOWN
WALL
BLOCKED
```

規則如下：

- `CONNECTED`：相鄰房間存在、兩側門互通，且 GraphMap 有 reciprocal edge。
- `UNKNOWN`：來源有門且相鄰座標為空。
- `WALL`：來源方向沒有門。
- `BLOCKED`：來源有門，但座標已被沒有 reciprocal edge 的房間占用。
- 無可放置 Tile：保持 `UNKNOWN`，以 `NO_PLACEABLE_TILE` disabled。

Guest Projection 只接收 viewer-safe action：

```js
{
  type: "MOVE",
  label,
  enabled,
  payload: { direction }
}
```

Projection Builder 不讀 GraphMap、TileDeck 或 RotationManager。

### 2.6 Known-room Movement

已探索房間移動：

- 只允許 reciprocal Graph edge。
- 更新玩家目前房間。
- 不抽 Tile。
- 不再次 Reveal。
- 不抽卡。
- 不自動結束回合。

M17C 尚未追蹤 Speed movement points，因此當前玩家可以繼續逐格移動，直到自行 End Turn 或揭露新房間。

### 2.7 Unknown-room Reveal

未知方向依下列順序處理：

```text
Pure plan
→ revalidate authoritative state
→ construct rotated room in memory
→ commit TileDeck
→ add GraphMap room
→ add reciprocal-door edges
→ move player
→ existing reveal/card/Haunt pipeline
→ resolve turn
```

新房間只會與雙方都有門的接觸房間建立 reciprocal edge。只有一側有門時不建立連線。

Room trigger 沿用既有 pipeline：

```text
Event → Event deck
Item  → Item deck
Omen  → Omen deck → Haunt roll
```

未新增重複的 Reveal Event。

### 2.8 Haunt Turn Resolution

新增 action-scoped `ExplorationTurnResolutionTracker`，觀察既有：

- `HAUNT_TRIGGERED`
- `SCENARIO_RUNTIME_CREATED`
- `TURN_CHANGED`

若 Haunt lifecycle 沒有在同步流程內接管回合，探索 handler 只前進一次。

若未來 Haunt lifecycle 已完成 `TURN_CHANGED`，探索 handler 不會再次 `nextTurn()`，避免：

- 跳過 Haunt 後第一位玩家。
- 同一次 Reveal 發出兩次回合切換。
- Projection currentPlayerId 錯誤。

## 3. Multiplayer 整合

Host session 將 authoritative availability 注入 `MultiplayerProjectionBuilder`。

成功探索的單一權威週期會同步：

- 新房間。
- Graph edge。
- 玩家 marker。
- Card presentation。
- `currentPlayerId`。
- Guest projection revision。

拒絕方向：

- 不增加 revision。
- 不傳送 `STATE_UPDATED`。
- 不修改 deck、map、player 或 turn。

Reconnect 仍取得最新完整 Projection，不 replay Reveal 或 Card effect。

## 4. 相容性與固定邊界

M17C 未新增或修改：

- `EventTypes`
- `TransportMessageType`
- `ActionType`
- Save schema／version
- InformationRouter
- Client GraphMap
- Transport replay protocol

既有 `ROOM_DISCOVERED`、`PLAYER_MOVED`、`ROOM_REVEALED` 與 Card／Haunt pipeline 均沿用原有語意。

`CLAUDE.md` 維持 untracked，未納入 M17C diff。

## 5. 測試結果

### 5.1 Focused M17C Tests

```text
ExplorationPlacementPlannerTest     3 passed, 0 failed
ExplorationRuleTest                 8 passed, 0 failed
GameplayPhaseRouterTest             2 passed, 0 failed
MultiplayerExplorationRuleTest      3 passed, 0 failed
```

覆蓋內容：

- 全牌堆無法放置時 exact order 不變。
- Planner 與 availability 不消耗 random、不 emit、不 mutation。
- Tile rotation 與來源門配對。
- stale deck version／Tile mismatch 拒絕。
- Connected／Unknown／Wall／Blocked。
- wrong turn、非法方向與穿牆零 mutation。
- 接觸房間只有 reciprocal doors 才建立 edge。
- known-room movement 不 redraw、不 Reveal、不換回合。
- Event／Item／Omen pipeline。
- Omen Reveal 建立 Runtime 且只換一次回合。
- 模擬 Haunt lifecycle 已接管時不重複換回合。
- Host 與兩位 Guest 接收相同公開地圖。
- 拒絕方向不增加 Multiplayer revision。

### 5.2 Regression Gate

```text
Full regression suite: PASS
Existing Multiplayer Regression: PASS
Existing Scenario Regression: PASS
Local Play Integration: 26 passed, 0 failed
Local Play Stability: 26 passed, 0 failed
Multiplayer Action / Turn Sync: 24 passed, 0 failed
Multi-Guest Browser Smoke Regression: 15 passed, 0 failed
Multiplayer House Map Integration: 10 passed, 0 failed
Multiplayer Movement Feedback Integration: 6 passed, 0 failed
git diff --check: PASS
Production Build: PASS
Vite transformed modules: 237
```

### 5.3 Actual Browser Smoke

實際啟動 Socket Server 與 Vite 後，瀏覽器確認：

```text
Root URL
→ LAN Host Lobby
→ QR Code visible
→ 0/2 roster visible
→ Start Session disabled while roster incomplete
```

Host 沒有回到 `Choose how to play` 頁面。

測試後已關閉測試分頁與本次啟動的背景服務。

### 5.4 Physical LAN Validation

狀態：

```text
PENDING
```

尚需由實體 Host、兩台 Guest 行動裝置完成：

- QR 加入與角色分配。
- 四方向 enabled／disabled 顯示。
- 已知房間連續移動。
- 未知方向 Reveal。
- Event／Item／Omen 呈現。
- Reveal 後換回合。
- Host 與兩台 Guest 地圖同步。
- 拒絕方向不閃動、不增加 revision。
- 斷線重連取得最新地圖且不重播卡片。

此項是最終 Milestone acceptance gate，不是目前已知程式碼 blocker。

## 6. 文件更新

已更新：

- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/CONSTRAINTS.md`
- `docs/MULTIPLAYER_SESSION_CONTRACT.md`
- `docs/TECH_DEBT.md`

已新增：

- `docs/EXPLORATION_GAMEPLAY_FLOW.md`
- `CONSTRAINT-098 — Gameplay-driven Milestones`

記錄的技術債：

- `TECH-DEBT-080`：Incomplete Third-Edition Tile Placement Rules。
- `TECH-DEBT-081`：Shared Pre-Haunt And Post-Haunt Base Movement。
- `TECH-DEBT-082`：M17C Temporary Movement Economy。

## 7. Out of Scope

M17C 未實作：

- Basement／Ground／Upper Tile eligibility。
- Region-backed Tile selection。
- 區域 open-door preservation。
- 無法放置時調整既有房屋。
- Speed movement budget。
- Character abilities。
- Trait checks、combat、monsters、death、inventory。
- Haunt 後共享 base movement framework。
- Client GraphMap、pathfinding 或 topology reconstruction。
- 新 UI framework。

## 8. 最終狀態

```text
M17C — Exploration Gameplay Rules

IMPLEMENTATION:
COMPLETE

AUTOMATED VALIDATION:
PASS

PRODUCTION BUILD:
PASS

AUTOMATED MULTI-GUEST BROWSER REGRESSION:
PASS

ACTUAL HOST BROWSER SMOKE:
PASS

PHYSICAL LAN VALIDATION:
PENDING

REMAINING KNOWN CODE BLOCKERS:
NONE

MILESTONE CLOSURE:
PENDING PHYSICAL LAN ACCEPTANCE
```

M17C 已完成程式實作與自動化驗證。實體 LAN 驗證通過後，即可將 Milestone 狀態更新為 `COMPLETE / ACCEPTED`，並進行 commit、push 與合併。
