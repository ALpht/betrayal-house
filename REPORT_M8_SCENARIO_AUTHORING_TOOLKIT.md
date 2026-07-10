# M8 — Scenario Authoring Toolkit

**Phase**: 10B
**Branch**: `feature/scenario-authoring-toolkit`
**Date**: 2026-06-21
**Status**: COMPLETED

---

## Overview

M8 建立 Scenario Production Pipeline，將專案從「Scenario Execution Platform」升級為「Content Production Platform」。

### Before M8

```
Author
  ↓ (手刻 new ScenarioDefinition({...}))
ScenarioDefinition
  ↓
Runtime
```

### After M8

```
Author
  ↓
ScenarioTemplate (optional skeleton)
  ↓
ScenarioBuilder (fluent API, required-field check)
  ↓
ScenarioDefinition
  ↓
ScenarioCatalog (metadata query layer)
  ↓
ScenarioFactory (validate → lint → runtime)
  ↓
ScenarioFactoryResult { runtime, warnings }
```

---

## 新增檔案

| # | File | Lines | Role |
|---|------|-------|------|
| 1 | `src/scenario/authoring/BuilderError.js` | 10 | 獨立 Error 類別，與 ValidationError 責任分離 |
| 2 | `src/scenario/authoring/ScenarioBuilder.js` | 84 | Fluent Builder Pattern |
| 3 | `src/scenario/authoring/ScenarioTemplate.js` | 20 | 標準劇本骨架 |
| 4 | `src/scenario/authoring/ScenarioCatalog.js` | 33 | Metadata Query Layer |
| 5 | `src/scenario/authoring/ScenarioFactoryResult.js` | 17 | Factory 回傳值封裝 |
| 6 | `src/scenario/authoring/ScenarioFactory.js` | 38 | Content Pipeline |

---

## 模組細節

### 1. BuilderError.js

```js
class BuilderError extends Error {
    constructor({ field, message })
    // field: 缺失的欄位名稱字串
    // message: 人類可讀描述
}
```

與 `ValidationError` 的責任邊界：

| Error | 時機 | 責任 |
|-------|------|------|
| `BuilderError` | `builder.build()` 時 | 作者還沒填完 required field |
| `ValidationError` | `validator.validate()` 時 | 內容違反 ScenarioContract |

---

### 2. ScenarioBuilder.js

**Fluent API：**

```
setId(v)
setTitle(v)              ← Builder Required
setDescription(v)        ← Builder Required
setDifficulty(v)
setVersion(v)
setObjectives({ heroes, traitor })  ← Builder Required
setTraitorRule(v)        ← Builder Required
setRuntimeClass(v)       ← Builder Required
setVictoryCondition(v)
setMetadata(key, value)
build() → ScenarioDefinition
```

**`build()` 檢查的 Required Fields：**

| Field | 檢查條件 |
|-------|----------|
| `title` | 非空字串 |
| `description` | 非空字串 |
| `objectives` | 含 heroes 和 traitor |
| `traitorRule` | 非空值 |
| `runtimeClass` | 非空值 |

**未強制（交由 Validator 決定）：**
- `victoryCondition` — 可為 null
- `metadata.id` — 若未設則自動從 title 產生（toSnakeCase）
- `metadata.difficulty` / `metadata.version` — 可選

**Auto-ID 規則：**
```
"Escape the Dark" → "escape_the_dark"
"My Awesome Scenario" → "my_awesome_scenario"
```
移除特殊字元，轉小寫，空白轉底線。

---

### 3. ScenarioTemplate.js

四個骨架方法，全部回傳**未完成的 ScenarioBuilder**：

| Method | Preset |
|--------|--------|
| `standardHaunt()` | `traitorRule = "random"` |
| `objectiveDriven()` | `traitorRule = "random"` |
| `traitorDriven()` | `traitorRule = "random"` |
| `cooperative()` | `traitorRule = "random"` |

禁止建立任何 Domain Instance（CONSTRAINT-022）。

使用範例：

```js
const def = ScenarioTemplate.standardHaunt()
    .setTitle("The Ritual")
    .setDescription("Complete the ritual before time runs out")
    .setObjectives({ heroes: "Stop the ritual", traitor: "Complete the ritual" })
    .setRuntimeClass(RitualScenario)
    .setVictoryCondition(RitualVictory)
    .build();
```

---

### 4. ScenarioCatalog.js

```
constructor(registry)
get(id) → ScenarioDefinition | null
has(id) → boolean
getAll() → ScenarioDefinition[]
findByTag(tag) → ScenarioDefinition[]
findByDifficulty(level) → ScenarioDefinition[]
```

**CONSTRAINT-019**：僅允許 Metadata Query。沒有 `findByRuntimeClass()`、`findByVictoryCondition()` 等。

---

### 5. ScenarioFactoryResult.js

```js
class ScenarioFactoryResult {
    constructor({ runtime, warnings })
    get runtime() → ScenarioRuntime
    get warnings() → Array<{ code, path, message, severity }>
}
```

封裝物件而非裸 Object，預留未來擴充（migrationWarnings, compatibilityWarnings, authoringMetadata）。

---

### 6. ScenarioFactory.js

```
constructor({ catalog, runtimeFactory, validator, linter })
```

**`create(scenarioId, context, router)`：**

```
catalog.get(scenarioId)
  ↓
validator.validate(definition)   ← 失敗時拋出，Runtime 不建立
  ↓
linter.lint(definition) → warnings
  ↓
definition.createScenario()
  ↓
runtimeFactory.create(scenario, context, router)
  ↓
return ScenarioFactoryResult { runtime, warnings }
```

**`createFromDefinition(definition, context, router)`：**
同上，跳過 catalog lookup。

**CONSTRAINT-020**：Read-Only Pipeline，禁止 `definition.fix()` / `definition.patch()`。

---

## 測試案例（13 cases）

全數通過。

### CASE 1 — Builder 完整填入後 build()

**驗證**：所有 required field 填滿 → 回傳合法 ScenarioDefinition

```js
new ScenarioBuilder()
    .setTitle("Escape the Dark")
    .setId("escape_dark")
    .setDescription("A dark escape scenario")
    .setObjectives({ heroes: "Find the exit", traitor: "Stop them" })
    .setTraitorRule("random")
    .setRuntimeClass(ValidScenario)
    .build()
```

**檢查點**：
- `instanceof ScenarioDefinition`
- `metadata.id === "escape_dark"`
- `metadata.title === "Escape the Dark"`
- `metadata.description === "A dark escape scenario"`
- `traitorRule === "random"`
- `runtimeClass === ValidScenario`
- `objectives.heroes === "Find the exit"`
- `objectives.traitor === "Stop them"`

---

### CASE 2 — Builder 缺 runtimeClass

**驗證**：缺 runtimeClass → 拋出 BuilderError，field = "runtimeClass"

```js
expect(builder.build()).toThrow(BuilderError)
expect(error.field).toBe("runtimeClass")
```

---

### CASE 3 — Builder 缺 traitorRule

**驗證**：缺 traitorRule → 拋出 BuilderError，field = "traitorRule"

---

### CASE 4 — Template → 填入 → build()

**驗證**：`ScenarioTemplate.standardHaunt()` 回傳 Builder，填入後可 build

```js
ScenarioTemplate.standardHaunt()
    .setTitle("Standard Haunt")
    .setId("standard_haunt")
    .setDescription("A standard haunt scenario")
    .setObjectives({ heroes: "Survive", traitor: "Kill all" })
    .setRuntimeClass(ValidScenario)
    .build()
```

**檢查點**：
- `traitorRule === "random"`（從 Template 繼承）
- `metadata.title === "Standard Haunt"`
- `instanceof ScenarioDefinition`

---

### CASE 5 — Catalog get / getAll

**驗證**：Catalog 正確委託 Registry

- `catalog.get("catalog_test") === def5`
- `catalog.getAll().length === 1`

---

### CASE 6 — Catalog findByDifficulty

**驗證**：依 difficulty 過濾

```js
const def6a = builder.setDifficulty(1).build()
const def6b = builder.setDifficulty(3).build()
catalog.findByDifficulty(1) → [def6a]
catalog.findByDifficulty(3) → [def6b]
```

---

### CASE 7 — Catalog has()

**驗證**：存在性檢查

- `catalog.has("catalog_test") === true`
- `catalog.has("nonexistent") === false`

---

### CASE 8 — Factory createFromDefinition

**驗證**：完整 pipeline 執行

```js
factory.createFromDefinition(def8, context8, router8)
```

**檢查點**：
- 回傳值 `instanceof ScenarioFactoryResult`
- `result.runtime` 存在
- `result.warnings` 為 Array

---

### CASE 9 — Factory warnings 含 lint 內容

**驗證**：lint 未被丟棄（MISSING_VICTORY_CONDITION warning 存在）

Definition 未設 `victoryCondition` → lint 產生 `MISSING_VICTORY_CONDITION` warning → `result.warnings` 包含該 entry。

---

### CASE 10 — Factory validation failure

**驗證**：Validator 拋錯時 Runtime 不建立

```js
factory.createFromDefinition({ metadata: { id: "bad" } }, null, null)
// ValidationErrorCollection thrown, no runtime created
```

---

### CASE 11 — Builder auto-generates id

**驗證**：`setTitle("My Awesome Scenario")` + 不設 id → id 自動為 `"my_awesome_scenario"`

---

### CASE 12 — Factory create via catalog

**驗證**：完整 pipeline（catalog → validate → lint → runtime）

```js
factory.create("catalog_factory", context12, router12)
```

---

### CASE 13 — Builder 缺 title

**驗證**：缺 title → 拋出 BuilderError，field = "title"

---

## 約束遵守驗證

| Constraint | 內容 | 驗證方式 |
|------------|------|----------|
| CONSTRAINT-019 | Catalog 僅允許 Metadata Query | Catalog 無 findByRuntimeClass / findByVictoryCondition |
| CONSTRAINT-020 | Factory 為 Read-Only Pipeline | Factory 不呼叫 definition.fix/patch/migrate |
| CONSTRAINT-021 | Builder 不得依賴 Validator | build() 只檢查 required field 存在，不檢查 TraitorRule 合法性、Contract 符合性 |
| CONSTRAINT-022 | Template 不得建立 Domain Instance | Template 只回傳 ScenarioBuilder，不 new Runtime / VictoryCondition |

---

## Pipeline 全貌

```
Scenario Author
  ↓
ScenarioTemplate (optional)
  ↓
ScenarioBuilder.build()
  ↓
ScenarioDefinition
  ↓  (註冊到 Registry)
ScenarioCatalog.get()
  ↓
ScenarioValidator.validate()
  ↓
ScenarioLint.lint()  →  warnings preserved
  ↓
ScenarioDefinition.createScenario()
  ↓
ScenarioRuntimeFactory.create()
  ↓
ScenarioRuntime
```

---

## 技術債狀態

| ID | 標題 | 狀態 | 備註 |
|----|------|------|------|
| TECH-DEBT-030 | Scenario Definition version 欄位尚未強制 | **OPEN** | 延至 Phase 10C |
| TECH-DEBT-031 | Scenario Discovery Strategy 尚未建立 | **PARTIALLY RESOLVED** | Catalog 建立但非唯一入口 |

---

## 不包含事項（已排除）

- ScenarioMigration — 延至 Phase 10C
- TECH-DEBT-030 完全解決 — 延至 Phase 10C
- TECH-DEBT-031 完全解決（Catalog 成唯一入口）— 延至 Phase 10C
- ScenarioController 改用 Factory — 未排入
- 修改現有檔案（Runtime、Lifecycle、Router、Victory、Validator、Lint、Registry）— 禁止

---

## 架構位置

```
M1  Graph Engine                ✓
M2  Exploration Engine          ✓
M3  First Playable Haunt        ✓
M4  Scenario Test Platform      ✓
M5  Secret Information Layer    ✓
M6  Runtime Lifecycle           ✓
M7  Content Governance          ✓
M8  Scenario Production Pipeline  ← 本次完成
--------------------------------------
    接下來：
M9  Scenario Batch Regression   ← 下一個 branch
M10 Content Scale-out
M11 Multiplayer Foundation
M12 Presentation Layer
```
