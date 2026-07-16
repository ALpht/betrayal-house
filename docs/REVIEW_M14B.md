# M14B Development Report — Playable Scenario Pack 01

Version: 1.0
Status: COMPLETE
Branch: `feature/playable-scenario-pack-01`

---

## Mission

M14B validates that the project can now produce playable game content without expanding the platform.

```text
Scenario Content
  -> ScenarioDefinition
  -> Existing Runtime / Victory / Information
  -> Scenario Tests
```

The milestone follows the current project direction:

```text
Content First
Architecture Freeze
Framework Modified = 0
```

No new Runtime API, Scenario Framework API, Victory Framework API, Rule Engine, Presentation API, ActionType, ScenarioActionHandler, or ActionValidator change was introduced.

---

## What Was Built

M14B adds **Playable Scenario Pack 01**, a five-scenario content pack focused on different gameplay patterns.

| Scenario | Gameplay Pattern | Hero Objective | Traitor Objective | Main Actions |
|---|---|---|---|---|
| `relicEscape` | Collection / Escape | Collect 3 unique relics and reach the exit | Delay heroes for 8 turns | COLLECT, MOVE |
| `ashenTitan` | Boss / Anchor Destroy | Destroy 2 anchors and reduce boss HP to 0 | Keep the Titan alive for 10 turns | ATTACK, DESTROY |
| `lostHeir` | Escort / Protect NPC | Escort the heir 4 steps | Kill the heir or delay 8 turns | INTERACT, ATTACK |
| `sealedGallery` | Puzzle / Ordered Activation | Collect 3 symbols and activate moon -> key -> flame | Cause 3 mistakes or delay 10 turns | COLLECT, ACTIVATE |
| `maskedHost` | Hidden Information / Traitor Objective | Find 3 clues, reveal traitor, destroy 2 cursed masks | Stay hidden for 9 turns | COLLECT, INTERACT, DESTROY |

Pack-level additions:

```text
5 Scenario implementations
5 VictoryConditions
5 ScenarioDefinitions
1 ScenarioBundle
5 focused scenario tests
1 pack-level test
```

---

## Gameplay Design

### Relic Escape

Core Loop:
Heroes collect unique relic IDs, then move to the exit.

State:
`collectedRelicIds`, `exitReached`, `turnsElapsed`

Payload Contract:
`COLLECT { itemId: "relic", targetId }`
`MOVE { destination: "exit" }`

Rules:
Duplicate relic IDs are ignored. Moving to the exit before all relics are collected is a no-op.

Known Balance Risk:
The 8-turn limit may be too generous if relic acquisition is fast.

### The Ashen Titan

Core Loop:
Heroes destroy anchors to lower HP floors, then attack the Titan.

State:
`bossHp`, `destroyedAnchorIds`, `turnsElapsed`

Payload Contract:
`DESTROY { targetType: "anchor", targetId }`
`ATTACK { target: "titan" }`

Rules:
Boss HP floor is 6 with 0 anchors destroyed, 1 with 1 anchor destroyed, and 0 with 2 anchors destroyed.

Known Balance Risk:
HP 12 plus two anchors may be too long for small player counts.

### The Lost Heir

Core Loop:
Heroes escort the heir while the traitor attempts to kill the NPC.

State:
`escortProgress`, `npcAlive`, `turnsElapsed`

Payload Contract:
`INTERACT { interactionType: "escort" }`
`ATTACK { target: "npc" }`

Role Rules:
Heroes may escort. The traitor may attack the NPC. Unauthorized role actions are no-op and leave state unchanged.

Known Balance Risk:
NPC death is immediate and may be too decisive if the traitor has easy access.

### The Sealed Gallery

Core Loop:
Heroes collect symbols, then activate altars in the required order.

State:
`symbolsCollected`, `sequenceIndex`, `mistakes`, `turnsElapsed`

Payload Contract:
`COLLECT { itemId: "symbol" }`
`ACTIVATE { altarId }`

Rules:
Activation is disabled/no-op until 3 symbols are collected. Malformed payloads are no-op. A valid but wrong altar increments `mistakes` and resets `sequenceIndex`.

Known Balance Risk:
Three mistakes may be too punishing during first playtest.

### The Masked Host

Core Loop:
Heroes collect clues, reveal the traitor, then destroy cursed masks.

State:
`cluesFound`, `traitorRevealed`, `destroyedCursedMaskIds`, `turnsElapsed`

Payload Contract:
`COLLECT { itemId: "clue" }`
`INTERACT { interactionType: "revealTraitor" }`
`DESTROY { targetType: "cursedMask", targetId }`

Hidden Information:
Hero and traitor objectives are routed through `InformationRouter`.

Known Balance Risk:
Nine turns may not leave enough time after the reveal step.

---

## Validation

New tests:

```text
RelicEscapeScenarioTest
AshenTitanScenarioTest
LostHeirScenarioTest
SealedGalleryScenarioTest
MaskedHostScenarioTest
PlayableScenarioPack01Test
```

Each focused scenario test covers:

```text
Initial state
Supported actions
Action availability
Valid payload transitions
Invalid payload no-op
Unauthorized role action no-op where relevant
Counter caps / duplicate prevention
Hero victory
Traitor victory
Snapshot / restore continuation
Runtime isolation where relevant
```

Pack-level test covers:

```text
5 definitions
5 descriptors
Unique IDs
Metadata and objectives completeness
Bundle validation
Registry / loader / runtime path
Runtime creation
```

Build result:

```text
npm.cmd run build
PASS
```

---

## Architecture Review

Allowed areas changed:

```text
src/scenario/scenarios/playable/
src/scenario/package/bundles/
src/test/
src/testRunner.js
docs/ROADMAP.md
docs/REVIEW_M14B.md
```

Forbidden framework areas were not modified:

```text
src/scenario/runtime/
src/scenario/action/ActionType.js
src/scenario/action/ActionValidator.js
src/scenario/action/ScenarioActionHandler.js
src/scenario/victory/
src/presentation/
src/rules/
```

M14B confirms that playable content can be produced using the existing platform.

---

## Follow-Up For M14C

M14C should be **Playtest & Balance**, not another content expansion milestone.

Recommended playtest focus:

```text
Win rate
Turn limits
Boss HP pacing
Escort fragility
Puzzle mistake tolerance
Hidden-information reveal timing
Action availability clarity
```

Do not add more framework during M14C unless a separate owner-approved architecture exception is created.
