# M14C Development Report - Playtest & Balance

Version: 1.0
Status: COMPLETE
Branch: `feature/playtest-balance-01`

---

## 1. Baseline Method

M14C used deterministic scenario samples to establish an initial balance baseline for all five playable scenarios from M14B.

The baseline separates hard assertions from balance observations:

```text
Hard Assertions:
- hero and traitor victory paths remain reachable
- timeout boundaries are consistent
- progress actions do not become permanently locked
- snapshot / restore remains consistent
- hidden information remains isolated

Balance Observations:
- meaningful action count
- blocked action count
- pacing notes
- required unique targets
- player-count caveats
```

Baseline record shape:

```text
scenarioId
sampleName
playerCount
result
victoryReason
turnsElapsed
meaningfulActionCount
blockedActionCount
requiredUniqueTargets
restoreConsistent
notes
```

Samples executed for each scenario:

```text
fast hero
slow hero
traitor pressure
timeout
invalid / blocked
```

---

## 2. Harness Limitations

The deterministic harness now supports explicit `playerCount` values and records both 2-player and 4-player baselines.

Current limitation:

```text
Current deterministic harness does not model per-player action economy.
Player-count balance remains a human playtest risk.
```

This means the recorded `playerCount` is useful for scenario context and future comparison, but it does not yet prove true multiplayer pacing, turn order pressure, table talk, or physical room-distance pressure.

---

## 3. Scenario Baselines

| Scenario | Baseline Result |
|---|---|
| `relicEscape` | Hero exit and traitor timeout are both reachable. Exit remains locked before 3 unique relics and unlocks after requirements. |
| `ashenTitan` | Anchor HP floors work: 0 anchors stop damage at HP 6, 1 anchor stops at HP 1, 2 anchors allow lethal damage. |
| `lostHeir` | Baseline exposed a structural imbalance: traitor NPC victory could happen after one action while hero completion requires four escort actions. |
| `sealedGallery` | Malformed payload and valid wrong altar are correctly separated. Wrong valid altars add mistakes and reset sequence. |
| `maskedHost` | Hero and traitor paths are reachable. Hero-visible packets do not include traitor-only objective packets, including after restore. |

---

## 4. Evidence-backed Adjustments

### Lost Heir

Observed Problem:
The traitor could win by killing the heir with a single ATTACK action, while the earliest hero completion requires four escort actions.

Evidence / Reproduction:
The original `lostHeir` traitor path was:

```text
ATTACK { target: "npc" }
=> npcAlive = false
=> VictoryResult.traitor("lostHeir", "heir_lost")
```

Original Value:

```text
npcAlive = false after 1 traitor ATTACK
```

New Value:

```text
npcWounds = 0 initial state
npcWounds += 1 per valid traitor ATTACK
npcAlive = false when npcWounds >= 2
```

Reasoning:
This keeps the rule scenario-owned and gives heroes at least one visible pressure state before immediate failure. It also avoids adding a generic NPC system, combat system, or damage framework.

Regression Result:
Updated `LostHeirScenarioTest` verifies:

```text
first wound does not end the scenario
second wound defeats the heir
traitor victory remains reachable
snapshot / restore preserves npcWounds
timeout victory remains reachable
hero escort victory remains reachable
```

Remaining Risk:
Because the harness does not model true turn order or room distance, human playtesting must still confirm whether two wounds is enough counterplay for 2-player and 4-player games.

---

## 5. No-change Decisions

### Relic Escape

Decision: No change

Evidence:
The baseline confirms all three unique relic targets are required, duplicate collection is ignored, exit is unavailable before requirements, and exit becomes available after all relics are collected.

Reason:
No structural imbalance was proven by deterministic samples. The 8-turn limit remains a human pacing risk but does not block baseline playability.

Remaining Risk:
Actual map distance and room distribution may make relic collection either too easy or too slow.

### Ashen Titan

Decision: No change

Evidence:
The baseline confirms the HP floor design is meaningful:

```text
0 anchors: maximum effective damage reaches HP 6
1 anchor: maximum effective damage reaches HP 1
2 anchors: lethal damage becomes available
```

Reason:
The gating works without changing HP, floors, or turn limit. The deterministic sample does not prove that 10 turns is impossible.

Remaining Risk:
Small-player games may still struggle if real turn economy is stricter than the deterministic action sequence.

### Sealed Gallery

Decision: No change

Evidence:
Malformed altar payload is a no-op and does not increase mistakes. A valid but wrong altar increases mistakes and resets sequence.

Reason:
The puzzle rules are clear enough for baseline testing, and the three-mistake limit remains testable without adjustment.

Remaining Risk:
Human players may find full reset too punishing, especially with hidden or ambiguous UI feedback.

### Masked Host

Decision: No change

Evidence:
The baseline confirms hero victory, traitor timeout victory, premature destroy blocking, traitor-only objective isolation, and restore visibility consistency.

Reason:
The 9-turn limit creates pressure but deterministic samples did not prove the path is structurally impossible.

Remaining Risk:
This remains the highest-priority human playtest scenario because it has the longest sequence and hidden-information visibility requirements.

---

## 6. Regression Results

Implemented verification:

```text
src/test/PlayableScenarioBalanceTest.js
src/test/LostHeirScenarioTest.js
src/test/PlayableScenarioTestUtils.js
src/testRunner.js
```

Expected validation gate:

```text
all existing tests
all balance tests
npm run build
forbidden framework diff review
```

Forbidden framework changes:

```text
ScenarioRuntime API: none
Victory Framework API: none
InformationRouter API: none
Presentation architecture: none
ActionType: none
ActionValidator: none
ScenarioActionHandler: none
GraphMap: none
Save / Load framework: none
Bundle framework: none
```

---

## 7. Remaining Human Playtest Risks

```text
Baseline balance established.
Major structural imbalance removed where evidence supported adjustment.
Further human playtesting is still required.
```

Next evaluation should use localhost play sessions to choose between:

```text
UI integration polish
Local multiplayer synchronization
```

The choice should be based on actual playable-flow gaps, not on speculative framework expansion.
