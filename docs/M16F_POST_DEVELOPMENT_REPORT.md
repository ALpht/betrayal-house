# M16F 開發後報告

Milestone：M16F — Dedicated Host & Multi-Guest LAN Foundation

分支：`feature/dedicated-host-multi-guest`

完成日期：2026-07-23

最終狀態：**COMPLETE**

## 1. 執行摘要

M16F 已將原本的單一 Host／Guest LAN 原型，擴充為可在私人區域網路中運作的
「專用電腦 Host + 2 至 3 台移動裝置」多人遊戲基礎。

電腦不再扮演玩家，而是負責：

- 建立 LAN 房間與顯示 QR Code。
- 維持唯一的權威遊戲狀態。
- 顯示公共地圖舞台。
- 即時監控所有玩家的連線狀態。

移動裝置則負責：

- 透過 QR Code 加入指定房間。
- 顯示自己的角色、目前回合與可執行動作。
- 接收只屬於該玩家的 viewer-safe projection。
- 在網路中斷或頁面重新整理後恢復原本身分。

最終流程已移除沒有實際決策價值的 `Mark Ready`。玩家加入後立即取得角色；
當指定人數全部連線後，Host 可直接開始遊戲。

## 2. 原始目標

M16F 的主要產品目標如下：

```text
遊戲只在 LAN 中運作
電腦作為專用 Host
2 或 3 台移動裝置作為獨立玩家
Host 自動偵測私人 LAN IPv4
QR Code 自動帶入 Host IP、Socket 位址與房間代碼
每個 Guest 擁有固定且互相隔離的角色身分
單一 Guest 斷線不得重置其他玩家
```

## 3. 最終使用流程

### 3.1 建立房間

1. 電腦開啟 Host LAN Game。
2. Host 選擇 2 Players 或 3 Players。
3. Socket Server 偵測目前私人 LAN IPv4。
4. Host 產生包含下列資訊的 QR Code：

```text
Guest 頁面 URL
Socket Server LAN URL
Room Code
Guest mode
```

Host 即使透過 `localhost` 開啟，QR Code 仍會使用實際 LAN IPv4，不會產生手機無法
存取的 localhost 網址。

### 3.2 玩家加入

1. 玩家掃描 QR Code。
2. 玩家只需輸入顯示名稱。
3. Server 依加入順序立即分配角色。
4. 手機顯示 Assigned Character，等待 Host 開始。
5. 不需要 `Mark Ready`。

預設角色順序：

| 加入順序 | 角色 |
|---|---|
| 1 | Brandon Jaspers |
| 2 | Ox Bellows |
| 3 | Professor Longfellow |

角色預分配順序與正式建立 authoritative session 時的角色順序一致，因此開始遊戲後
不會改變角色。

### 3.3 開始遊戲

Start Session 的條件為：

```text
房間仍處於 WAITING_FOR_PLAYERS
實際玩家數等於 Host 選擇的人數
所有玩家目前皆為 CONNECTED
guestId 不重複
```

開始後：

- QR Code 與房間設定從 Host 畫面移除。
- Host 切換至 `House Map` 公共地圖舞台。
- 手機切換至個人控制器。
- Host 不接收任何玩家私有 projection。
- 每個 Guest 只接收自己的 projection 與 action availability。

## 4. Host 公共畫面

### 4.1 等待房間

等待階段包含：

- QR Code。
- 已加入人數。
- 玩家顯示名稱。
- 預分配角色。
- 玩家連線狀態。
- Start Session、Close Room 與 New LAN Game。

### 4.2 遊戲中地圖舞台

遊戲開始後 Host 會切換為 `data-host-view="map"` 的公共地圖畫面。

目前地圖設計尚未完成，因此 M16F 先提供可延伸的地圖框架：

- House Map 標題與探索階段。
- 地圖網格 viewport。
- Entrance Hall 起始房間。
- 方位標記。
- 未來房間與玩家位置的掛載區域。
- 地圖下方的玩家連線狀態列。

目前的地圖框架不是完整 gameplay renderer；它的責任是確立 Host 在遊戲開始後
必須進入地圖模式，而不是繼續顯示 QR Lobby。

## 5. Guest 個人畫面

手機畫面依狀態切換：

### 加入前

- 顯示名稱輸入。
- Join Game。
- 不要求手動輸入 Host IP 或 Room Code。

### 等待 Host

- Assigned Character。
- Waiting for Host。
- Leave Room。

### 遊戲中

- 自己的角色。
- 目前回合玩家。
- Scenario 名稱。
- 自己可執行的動作。
- 非自己回合時的明確提示。
- Leave Game。

下列診斷或重複資訊已從一般玩家畫面移除：

- Role GUEST。
- 常駐 Reconnect。
- Mark Ready。
- LAN Status 技術資訊。
- 空的 Latest visible card。

## 6. 多玩家身分與資訊隔離

M16F 將三種身分分開處理：

```text
connectionId：單次 Socket 連線
guestId：玩家在房間中的穩定身分
playerId：authoritative game session 中的角色實體
```

Server 以 `guestId` 維持房間席位，Host session 再透過
`MultiplayerPlayerBindingRegistry` 將 Guest 綁定至 `playerId`。

每位 Guest 的狀態由 Host 個別建立：

- 不會向所有玩家廣播同一份私有狀態。
- Guest A 看不到 Guest B 的私有資訊。
- Guest B 看不到 Guest A 的私有資訊。
- Host 只接收公開 roster／connection information。
- Host 沒有 `playerId`、角色或玩家動作權限。

## 7. 斷線、重連與頁面重新整理

### 7.1 Host 即時監控

Host 會即時顯示每位玩家：

```text
PLAYING
RECONNECTING
OFFLINE
```

當單一玩家斷線時：

- 該席位進入 `RECONNECTING`。
- Host 公共畫面不會退回 QR Lobby。
- 其他玩家與 authoritative session 保持不變。

重連成功後，同一席位回到 `PLAYING`。

### 7.2 穩定身分恢復

Guest 裝置會在 `localStorage` 保存：

```text
Room Code
輪替式 Resume Token
Display Name
Last Action Sequence
Last Projection Revision
```

頁面重新整理或暫時斷線後，Guest 會自動嘗試恢復房間。Server 驗證 resume token
後會：

- 保留原本 `guestId`。
- 保留原本角色與 `playerId` binding。
- 將 binding 移至新的 `connectionId`。
- 輪替 resume token，避免舊 token 重複使用。
- 傳送最新 projection，而不是重播歷史事件。
- 延續 action sequence，避免重複提交。

主動 Leave Room／Leave Game 會清除裝置上的保存身分，不進入 reconnect grace。

## 8. LAN 位址與 QR Code

Socket Server 啟動時會：

1. 取得網路介面。
2. 排除 loopback、link-local 與不適用的虛擬介面。
3. 優先選擇實體私人 IPv4。
4. 透過初始 handshake 傳送 LAN IP 與 Socket port。

可使用 `LAN_HOST` 覆寫自動偵測：

```powershell
$env:LAN_HOST="192.168.1.20"
npm run server
```

Vite 設定為 LAN 可存取，預設服務如下：

```text
Browser: http://<LAN-IP>:5173
Socket:  http://<LAN-IP>:3001
```

## 9. 開發期間發現並修正的問題

### LAN HTTP 無法使用 `crypto.randomUUID`

私人 IP 的 HTTP 頁面可能不屬於 secure context，導致 `crypto.randomUUID()` 不可用。

修正：

- 優先使用原生 `randomUUID()`。
- 不可用時改用 Web Crypto／monotonic fallback。
- 保持 UUID-shaped runtime identity。

### 手機畫面水平偏移

技術狀態文字與固定高度容器曾使 390px 手機產生水平溢位。

修正：

- 所有 multiplayer container 使用 `min-width: 0`。
- 文字允許換行。
- Shell 只允許垂直捲動。
- 移除一般使用者不需要的診斷面板。

### Host 看不到 Start Session

等待房間的 QR 與玩家卡曾將 Start 按鈕推到首屏之外。

修正：

- Host controls 移到 Lobby 之前。
- 等待階段 controls 保持 sticky。

### 動作按鈕在手機首屏之外

Guest 卡片、Session panel 與診斷資訊的排列使動作控制出現在畫面下方。

修正：

- Guest 個人資訊與 action panel 直接相鄰。
- 移除常駐 LAN Status。
- 手機動作按鈕使用完整寬度與至少 48px 觸控高度。

### Host 將 RECONNECTING 誤判為 PLAYING

原判斷只排除 `DISCONNECTED`，因此 `RECONNECTING` 仍被當成已連線。

修正：

- 只有 `CONNECTED` 才顯示 PLAYING。
- RECONNECTING 使用獨立狀態、顏色與動畫。
- Lobby 保持 ACTIVE，不因單一玩家重連而退回等待畫面。

### Resume token 只存在記憶體

頁面重新整理會遺失 token，無法恢復同一身分。

修正：

- 新增 GuestResumeStore。
- token 與 action progress 寫入裝置 localStorage。
- 建立穩定的 lobby subscription，使更換 Socket 後 UI 仍持續收到事件。
- 自動重試恢復連線。

### Mark Ready 沒有產品價值

玩家加入後沒有其他角色或設定決策，Ready 只增加操作步驟。

修正：

- 移除 Guest Ready UI。
- Start eligibility 不再依賴 readiness。
- 玩家加入時直接預分配角色。
- 人數到齊且連線正常後即可開始。

## 10. 驗證結果

### 自動驗證

```text
Full regression suite: PASS
Focused M16F tests: PASS
git diff --check: PASS
Production build: PASS
Vite transformed modules: 227
```

新增或強化的測試涵蓋：

- Dedicated Host 不具有玩家身分。
- 2／3 Guest capacity。
- 加入後立即分配角色。
- 無 Ready 的 start eligibility。
- 公開 roster 與角色分配。
- 每位 Guest 的獨立 binding 與 projection。
- action ownership 與 turn synchronization。
- 單一 Guest reconnect。
- token 輪替與舊 token 拒絕。
- GuestResumeStore persistence。
- Host RECONNECTING／PLAYING 畫面。
- Host 開始後切換地圖且移除 QR。
- LAN IP resolver。
- 不安全 HTTP context 的 runtime ID fallback。

### 實際瀏覽器與裝置驗證

已驗證：

```text
Host 透過 localhost 建房，但 QR 使用實際 LAN IP
兩個獨立 Guest 加入同一房間
加入後不按 Ready 即取得 Brandon／Ox
Host 在人數到齊時直接啟用 Start Session
開始後 Host 顯示 House Map，不再顯示 QR
390x844 手機無水平溢位
非目前回合玩家的動作正確停用
Guest 頁面重新整理時 Host 即時顯示 RECONNECTING
Guest 自動恢復同一角色
Host 回到 All players online／PLAYING
恢復後 END_TURN 仍可正確推進回合
```

Owner 已於 2026-07-23 接受 M16F 完成狀態。

## 11. 架構影響

M16F 沒有改變既有核心規則與 scenario architecture。

保留的核心邊界：

- Host 是唯一 authoritative gameplay runtime。
- Guest 不建立本地 authoritative runtime。
- PlayerAction 仍經既有 action pipeline。
- Projection 由 Host 依 viewer 建立。
- Scenario、Victory、Information Router 與 Save／Load 邊界不變。

主要新增或擴充的邊界：

- MultiplayerRoomRoster。
- Stable guestId。
- MultiplayerPlayerBindingRegistry。
- Per-viewer state publisher。
- ReconnectReservationManager。
- GuestResumeStore。
- LAN address resolver。
- Host public lobby／map presentation。
- Guest phone controller presentation。

## 12. 已知限制與後續工作

M16F 完成的是 LAN 多玩家基礎，不包含下列功能：

- 完整可互動地圖 renderer。
- 房間探索結果即時繪製到 Host 地圖。
- 玩家棋子與位置同步呈現。
- Host 斷線恢復或 Host migration。
- 中途替補玩家。
- AI takeover。
- Spectator。
- Internet matchmaking。
- 使用者帳號與正式 authentication。
- Reliable delivery／action replay。
- 同房間 rematch。

建議下一階段優先工作：

1. 建立 HostMapProjection，只包含公共房間、門、座標與玩家位置。
2. 讓 authoritative session 在房間發現與玩家移動後發布公共地圖狀態。
3. 將 Host Map placeholder 換成實際 tile renderer。
4. 保持手機只顯示玩家私有狀態與可執行操作。
5. 定義遊戲結束後的結果畫面與 rematch lifecycle。

## 13. 執行方式

```powershell
npm run server
npm run dev
```

Host：

```text
http://localhost:5173/
```

正式建置：

```powershell
npm run build
```

完整測試：

```powershell
node src/testRunner.js
```

## 14. 最終結論

M16F 已達成可在 LAN 中實際使用的專用 Host／多 Guest 基礎。

```text
Implementation: COMPLETE
Automated Regression: PASS
Production Build: PASS
LAN Browser Flow: PASS
Physical Device Validation: ACCEPTED
Remaining M16F Code Blockers: NONE
```

下一階段可以直接在既有 Host `House Map` 舞台上接入公共地圖 projection 與 renderer，
不需要重新設計 Lobby、Guest identity、角色 binding 或 reconnect lifecycle。

## 15. 最終審查核准

最終審查結論：

```text
M16F POST-DEVELOPMENT REPORT

STATUS:
APPROVED

IMPLEMENTATION:
COMPLETE

AUTOMATED VALIDATION:
PASS

LAN BROWSER FLOW:
PASS

PHYSICAL DEVICE VALIDATION:
ACCEPTED

REMAINING M16 CODE BLOCKERS:
NONE
```

結案決議：

- M16 系列正式結案。
- 不新增 M16G。
- M16 已完成 Multiplayer Foundation，不再以補完名義擴張 Lobby、Binding、
  Reconnect 或 Session 架構。
- 後續工作轉入 M17，重點為 Host 公共地圖呈現、玩家位置、探索同步及遊戲結束體驗。

建議的 M17 順序：

```text
M17A  HostMapProjection
M17B  Host Tile Renderer
M17C  Player Position Projection
M17D  Movement / Explore Rendering
M17E  End Game / Result / Rematch UI
```

以上項目均使用 M16 已完成的多人平台，不屬於 M16 的未完成工作。
