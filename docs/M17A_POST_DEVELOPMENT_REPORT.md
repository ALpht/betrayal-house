# M17A 開發後報告

Milestone：M17A — Shared House Map Experience

分支：`feature/shared-house-map`

報告日期：2026-07-24

最終狀態：**COMPLETE**

## 1. 執行摘要

M17A 已在 M16 Dedicated Host 與 Multi-Guest LAN 平台上加入共用的公開房屋地圖體驗。

Host 現在會顯示完整的公開地圖、房間連線與所有公開玩家位置；Guest 繼續接收相同的公開
map DTO，但行動裝置只呈現自己角色目前所在的房間，避免手機畫面過度擁擠。

本階段同時完成 Host 與 Guest 的流程精簡：

- 開啟根網址後直接建立 Host LAN 大廳並顯示 QR Code。
- `Choose how to play` 頁面與 `ENTRY` mode 已移除。
- Guest 掃描 QR Code 後輸入顯示名稱、加入房間並立即取得角色分配。
- Guest 不再需要 `Mark Ready`，也不顯示 `Leave Game`。
- Host 選擇 `New LAN Game` 時會先關閉舊房間，再建立新房間與新 QR Code。
- 新房間不沿用舊 session、player binding 或角色分配；玩家重新加入後重新分配角色。

M17A 沒有把 GraphMap 或 Runtime 複製到 Client，也沒有新增 Transport Message、Domain
Event、Save schema 或 action pipeline。

## 2. 最終產品流程

### 2.1 Host

```text
開啟 http://<LAN-IP>:5173/
↓
自動建立 Host LAN 大廳
↓
顯示 QR Code 與玩家欄位
↓
Guest 加入並取得角色
↓
Host 啟動 Session
↓
畫面切換為完整公開 House Map
↓
持續顯示玩家位置、目前回合與連線狀態
```

不再存在 Host 前置選擇頁或人數設定頁。預設房間為兩位 Guest。

### 2.2 Guest

```text
掃描 QR Code
↓
輸入顯示名稱
↓
加入房間並取得角色
↓
等待 Host 啟動
↓
顯示角色介面、目前房間與可用行動
```

Guest 角色頁面以幾何圖案與色彩區別角色，圖案下方顯示角色名稱而非玩家輸入的顯示名稱。
地圖區只顯示該角色目前所在房間，且使用受限寬度與區域捲動，避免手機產生整頁水平偏移。

### 2.3 New LAN Game

`New LAN Game` 的最終語意如下：

```text
關閉舊 Room / Session
↓
銷毀舊 Host UI 與 subscriptions
↓
建立全新 Host composition
↓
建立新 Room Code 與 QR Code
↓
玩家重新加入
↓
依新房間加入順序重新分配角色
```

舊房間的 resume credential 以 Room Code 為範圍，因此不會讓玩家帶著舊角色進入新房間。

## 3. Projection 與資料邊界

### 3.1 Map adapter

Host session composition root 透過最小唯讀 adapter 讀取權威地圖狀態：

```js
{
  rooms: [{
    roomId, name, x, y, rotation, isRevealed, connectedRoomIds
  }],
  players: [{
    playerId, displayName, roomId
  }],
  currentPlayerId
}
```

此 adapter 僅存在於 Multiplayer integration boundary，沒有加入 ScenarioRuntime 或
GraphMap 公開 API。

### 3.2 Public map DTO

`MultiplayerProjectionBuilder` 輸出：

```js
map: {
  rooms: [{
    roomId, name, x, y, rotation, isRevealed, connections
  }],
  players: [{
    playerId, displayName, roomId
  }],
  currentPlayerId
}
```

已確認下列隔離規則：

- `connections` 僅來自既有 RoomNode Graph edge。
- connection ID 會去重並穩定排序。
- 隱藏房間不會進入 DTO。
- 指向隱藏房間的 connection ID 不會進入 DTO。
- 位於隱藏房間的 player marker 不會進入 DTO。
- 每次 build 都建立 fresh DTO。
- Host、Guest A、Guest B 與 Domain 不共享 mutable nested references。

### 3.3 Public-only Host path

`buildPublic()` 使用獨立的 public-only path，只回傳：

```js
{ map }
```

Dedicated Host 不具有：

- `viewerId`
- player assignment
- private character presentation
- Guest actions
- viewer-private information

### 3.4 Authoritative publication

Host session 已提供：

- `getPublicProjection()`
- `subscribePublicProjection(handler)`
- `publishAuthoritativeState()`
- 相容入口 `publishAllGuestStates()`

一次權威發布週期會：

1. 為所有有效 Guest target 建立並發送 viewer-safe projection。
2. 只通知 Host public subscribers 一次。
3. 在沒有 Guest fanout target 時仍更新 Host public projection。

Guest reconnect 沿用 targeted latest-projection recovery，不加入 replay 或新的發布協定。

## 4. Presentation 與 UI

### 4.1 HouseMapPresentationModel

Presentation model 已完整 deep freeze：

- model
- rooms array
- 每個 room
- 每個 room.connections
- players array
- 每個 player

### 4.2 HouseMapPresentationQuery

Query 負責將 projection 轉為安全的 presentation model：

- `map.currentPlayerId` 是唯一目前回合來源。
- 由 Query 衍生 `isCurrentPlayer`。
- 非陣列輸入視為空集合。
- 缺少必要欄位或座標非有限值的 entry 會被忽略。
- 沒有公開房間對應的 marker 會被忽略。
- 不修補 ID、不猜測座標、不重建 topology。
- Guest 可指定 `focusPlayerId`，只產生自己所在房間的 presentation。

### 4.3 HouseMapPanel

Host 與 Guest 共用同一個 passive `HouseMapPanel`，公開介面只有：

- `render(model)`
- `destroy()`

Panel 使用 CSS Grid、Room DOM、絕對定位 connection 與 player marker。每次 render
會先清除舊節點；非水平或垂直 edge 會安全略過線條，但房間仍正常渲染。

Panel 不依賴 EventBus、Socket、Runtime 或 DOM listener。

### 4.4 Host UI

Host 最終畫面分為兩個明確階段：

- Lobby：QR Code、Start Session、玩家欄位。
- Active：完整 House Map、公開玩家位置、目前回合與連線監控。

遊戲開始後不再保留 QR Code。Host 可持續看到玩家為 `PLAYING`、`RECONNECTING`
或離線，玩家恢復連線後回到原本身分。

### 4.5 Guest UI

Guest Active UI 已重新設計為精簡的個人角色控制器：

- 角色專屬幾何圖案與顏色。
- 角色名稱。
- `Your turn` 或等待中的回合提示。
- 自己角色目前所在房間。
- Scenario 名稱與可用行動。

已移除冗餘的 Role、Assigned、Current Turn、LAN Status 與 Leave Game 資訊。

## 5. Lifecycle 與清理

已涵蓋以下 cleanup：

- Host mode 切換前 unsubscribe public projection。
- Host session destroy 清空 public subscribers。
- Guest close、leave、destroy 清除舊 map。
- stale session callback 由 generation guard 阻擋。
- stale revision 不會更新 UI Controller 或增加 Panel render count。
- `New LAN Game` 先關閉舊房間，再建立新 Host app。
- 已移除的 `?mode=entry` 舊網址會直接導向 Host QR 大廳。

## 6. 測試結果

### 6.1 自動化驗證

```text
Full regression suite: PASS
HouseMapPresentationTest: PASS
MultiplayerHouseMapIntegrationTest: PASS
Existing Multiplayer Regression: PASS
Local Play Regression: PASS
Multi-Guest Browser Smoke Regression: PASS
Multiplayer Lobby UI Regression: PASS
git diff --check: PASS
Production Build: PASS
Vite transformed modules: 230
```

重點覆蓋內容：

- Projection 轉 presentation model。
- 完整 deep freeze。
- 多房間座標與 marker 對位。
- current-player highlight。
- empty state 與 rerender cleanup。
- hidden room、hidden connection 與 hidden-room marker isolation。
- unsupported edge passive handling。
- Host 與兩位 Guest 公開 map 一致。
- private projection 仍依 viewer 隔離。
- DTO mutation 不影響 Domain 或其他 build。
- move、explore 與 END_TURN 的一次性權威發布。
- reconnect 取得最新完整 map。
- 無 fanout target 時 Host projection 仍正常。
- stale revision 不造成短暫舊畫面。
- Root URL 與舊 entry URL 直接進入 Host mode。
- New LAN Game 先關閉舊房間，再建立新 Host lobby。

### 6.2 瀏覽器與 LAN 驗證

實際驗證已完成：

```text
Host 根網址直接顯示 QR 大廳
Host + 2 Guests 加入成功
兩位 Guest 取得不同角色
Host Start Session 成功
Host 顯示完整公開 House Map
Guest 顯示自己角色所在房間
角色圖案與角色名稱正確顯示
手機版面不再整頁向右偏移
Host 可持續監控玩家連線狀態
Guest reconnect 保留原身分
New LAN Game 回到新 QR 大廳
實體裝置驗證由 Owner 確認通過
```

Owner 已於 2026-07-24 確認測試通過。

正式產品決策：

> Guest Projection 保持完整公開地圖契約；Guest UI 預設以自身角色所在房間為聚焦呈現。

此過濾只發生在 Presentation Query，不改變 Multiplayer Projection Contract。未來若需要
完整地圖瀏覽、滑動或縮放，可沿用既有 DTO，不需修改 Multiplayer 平台。

## 7. 架構邊界確認

M17A 沒有修改或擴張：

- ScenarioRuntime
- GraphMap topology rules
- PlayerAction pipeline
- Transport message contract
- Save schema
- InformationRouter
- Domain Event catalog

本階段新增並固定：

- `CONSTRAINT-090`：GraphMap 是座標、揭露狀態、rotation 與 edge 的唯一權威來源。
- `CONSTRAINT-091`：Host／Guest 地圖只能消費 serializable projection。
- `CONSTRAINT-092`：隱藏拓撲與私有資訊必須在 Host projection boundary 移除。

`EVENT_CATALOG.md` 未修改，因為 M17A 沒有新增 Domain Event 或 Transport Message。

未追蹤的 `CLAUDE.md` 不屬於 M17A，必須維持在最終 diff 之外。

## 8. 明確未包含項目

M17A 沒有擴張為：

- Client GraphMap
- persistent map cache
- map replication protocol
- pathfinding
- move availability calculation
- map move controls
- topology reconstruction
- 通用 geometry engine
- renderer framework
- Internet multiplayer
- Host migration
- rematch lifecycle

這些項目若有需要，必須在後續 milestone 重新定義範圍。

## 9. 後續建議

下一階段建議進入 M17B，利用既有 projection 與 `HouseMapPanel` 改善探索及移動回饋：

```text
M17B
Exploration And Movement Visual Feedback

↓

房間揭露動畫
角色移動回饋
目前回合視覺提示
地圖狀態轉換
```

M17B 必須重用 M17A 的 projection 與 presentation boundary，不應建立 Client GraphMap
或新的 map replication architecture。

## 10. 最終結論

M17A 已完成從 Multiplayer Foundation 到 Shared House Map Experience 的第一個產品化階段。

```text
M17A POST-DEVELOPMENT REPORT

STATUS:
APPROVED

IMPLEMENTATION:
COMPLETE

AUTOMATED VALIDATION:
PASS

PRODUCTION BUILD:
PASS

MULTI-GUEST BROWSER FLOW:
PASS

PHYSICAL LAN VALIDATION:
ACCEPTED

REMAINING M17A CODE BLOCKERS:
NONE
```

M17A 可以結案。後續工作應轉向探索與移動的視覺回饋，不需重新設計 Multiplayer、
Projection、Reconnect 或 Host session architecture。

本報告已於 2026-07-26 完成審查並核准結案及合併。
