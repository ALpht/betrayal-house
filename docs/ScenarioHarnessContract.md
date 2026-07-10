# Scenario Harness Contract

## 目的

定義 Scenario Test Harness 的責任邊界，確保 Harness 不被誤用為 Game Engine 的替代品。

## Harness 保證

ScenarioTestHarness 提供以下能力：

| API | 用途 |
|-----|------|
| `start()` | 啟動 Scenario Runtime |
| `emit(event, payload)` | 注入 EventBus 事件 |
| `checkVictory()` | 評估勝利條件 |
| `destroy()` | 清理 Scenario 資源 |

## Harness 不負責

以下 Game Engine 行為不屬於 Harness 範圍：

- ❌ Turn flow（`onTurnEnd` / `onTurnStart` / `update` 順序）
- ❌ Player movement（移動規則）
- ❌ Card drawing / resolving
- ❌ Dice rolling / haunt check
- ❌ Network / multiplayer sync
- ❌ Rendering / UI

如需測試以上行為，請使用對應的 Controller 測試或 Integration Test。

## 測試層級

```
ScenarioTestFactory.createFromDefinition()
    → Unit Test（不依賴 Registry）

ScenarioTestFactory.create()
    → Integration Test（依賴 Registry + Bootstrap）

ScenarioTestHarness + ScenarioAssertions
    → 統一驗證格式
```

## 使用範例

```js
const runtime = ScenarioTestFactory.createFromDefinition(def);
const harness = new ScenarioTestHarness(runtime);

harness.start();
harness.emit(PLAYER_MOVED, { playerId: "p1", toRoomId: "exit" });
const result = harness.checkVictory();

ScenarioAssertions.assertHeroesWon(result);
harness.destroy();
```

## Scenario 作者指南

每個 Scenario 的測試應：

1. 使用 `ScenarioTestFactory.createFromDefinition()` 建立 Runtime
2. 使用 `ScenarioTestHarness` 執行測試流程
3. 使用 `ScenarioAssertions` 驗證結果
4. 使用 `ScenarioSnapshot` 測試 Save/Load 回歸

禁止在 Scenario 測試中：

- ❌ 直接操作 EventBus（改用 `harness.emit()`）
- ❌ 手工 Mock ScenarioContext（改用 `ScenarioTestContext.create()`）
- ❌ 直接存取 Runtime private state（改用 `harness.state`）

## 檔案對應

| 檔案 | 用途 |
|------|------|
| ScenarioTestContext.js | Fake Context 工廠 |
| ScenarioTestFactory.js | Runtime 工廠 |
| ScenarioTestHarness.js | 測試協調器 |
| ScenarioAssertions.js | 標準斷言 |
| ScenarioSnapshot.js | Save/Load 回歸 |
| ScenarioFixtures.js | 測試資料建立 |
