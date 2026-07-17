# Local Play Issues

Version: 2.0
Milestone: M15B
Branch: `feature/local-play-stabilization`

---

## M15B Worklist

Every M15B code change must map to one of the issues below.

| Issue ID | Current Behavior | Expected Behavior | Severity | Planned Smallest Fix | Affected Files | Verification Method |
|---|---|---|---:|---|---|---|
| LP-005 | Removed action buttons can still invoke retained click handlers when a stale element reference is clicked. | Old DOM controls are inert after panel/session destroy. | High | Remove action button click handlers during `remove()`. | `src/presentation/ActionButton.js` | `LocalPlayStabilityTest` DOM cleanup |
| LP-006 | Restart has only single-cycle coverage. | 10 restart cycles produce one dispatch per intended click and no stale runtime/panel updates. | High | Add deterministic restart stress regression around existing lifecycle. | `src/test/LocalPlayStabilityTest.js` | 10-cycle stress assertion |
| LP-007 | Victory disables visible buttons, but direct late dispatch and stale click mutation are not covered. | Victory blocks dispatch and scenario state mutation. | High | Add dispatch-count and snapshot stability assertions after victory. | `src/test/LocalPlayStabilityTest.js` | Victory lock assertions |
| LP-008 | Hot-seat visibility is covered once, but panel replacement and current player refresh are not stress-checked. | Turn switch refreshes panels and removes prior private information. | Medium | Add turn-switch stability regression. | `src/test/LocalPlayStabilityTest.js` | Turn switch assertions |
| LP-009 | Latest card is listed as part of a card collection. | The newest visible card is clearly identifiable without adding card state. | Medium | Emphasize the first/latest visible card in `CardPanel`. | `src/presentation/panel/CardPanel.js` | Integration and manual checklist |
| LP-010 | Target selectors use raw ids and do not explain which action each selector feeds. | Static local DOM selectors are clearer without scenario-state inspection. | Medium | Improve selector labels/options/help text in local DOM. | `src/bootstrap/createLocalGameDom.js`, `src/style.css` | Manual checklist |
| LP-011 | Map is diagnostic and lacks strong current-player/current-room emphasis. | Map remains simple but clearly shows revealed rooms, current room, current player, and movement feedback. | Medium | Presentation-only canvas/CSS improvements. | `src/bootstrap/createLocalGameDom.js`, `src/style.css` | Manual checklist |
| LP-012 | M15 docs do not include stabilization evidence or M16 numbering. | Docs distinguish M15 integration, M15B stabilization, and future M16 multiplayer. | Medium | Update checklist, review report, issues, and roadmap. | `docs/` | Documentation review |

---

## Fixed

### LP-005 - Removed action buttons retained click handlers

Evidence:
Action buttons were removed from the DOM, but `ActionButton.remove()` did not remove the
registered click handler from the element.

Fix:
M15B removes the click handler before removing the element.

Regression:
`LocalPlayStabilityTest` clicks an old button reference after destroy and verifies no
dispatch occurs.

### LP-006 - Restart stress needed 10-cycle proof

Evidence:
M15 covered one restart path only.

Fix:
M15B adds 10-cycle restart stress coverage around create, start, interact, destroy, and
replace-session behavior.

Regression:
`LocalPlayStabilityTest` verifies exactly 10 intended clicks produce exactly 10 dispatches.

### LP-007 - Victory lock needed state mutation proof

Evidence:
M15 checked disabled buttons but did not assert direct late action attempts leave state
unchanged.

Fix:
M15B adds dispatch count and snapshot stability assertions after victory.

Regression:
`LocalPlayStabilityTest` verifies UI click and direct dispatch after victory do not mutate
state.

### LP-008 - Hot-seat refresh needed stability proof

Evidence:
M15 covered hidden-information visibility once, but did not verify current-player panel
refresh and non-append behavior.

Fix:
M15B adds turn-switch assertions for TurnPanel, CharacterPanel, ScenarioPanel, and
ActionPanel.

Regression:
`LocalPlayStabilityTest` verifies private text disappears and panel content is replaced.

### LP-009 - Latest visible card was not emphasized

Evidence:
Card panel showed a list headed `Cards`, making the current card less obvious.

Fix:
M15B labels the newest visible card as `Latest visible card`.

Regression:
Existing integration test and manual checklist verify the visible card remains readable.

### LP-010 - Target selectors were too raw

Evidence:
Target selectors exposed ids without explaining which scenario action they feed.

Fix:
M15B uses clearer static labels and option text without inspecting scenario state.

Regression:
Manual checklist verifies selector clarity.

### LP-011 - Map readability was diagnostic

Evidence:
The M15 map proved integration but did not strongly distinguish current room/player state.

Fix:
M15B improves presentation-only canvas drawing and movement feedback text.

Regression:
Manual checklist verifies map usability.

### LP-012 - Stabilization docs were missing

Evidence:
M15 docs described the first playable baseline, not hardening evidence.

Fix:
M15B adds stabilization checklist, review report, issue categories, and roadmap numbering.

Regression:
Documentation review.

---

## Deferred

### LP-002 - Action target selection remains static

Severity: Medium

Blocks M15B: No

Blocks Multiplayer: No

Reason:
M15B intentionally avoids runtime-state target discovery and generic target APIs. Static
selectors are acceptable for a stable local baseline.

Recommended milestone:
Post-M16 UI polish if real play shows target selection still blocks comprehension.

### LP-003 - Manual browser pass still needs repeated human play

Severity: Medium

Blocks M15B: No

Blocks Multiplayer: No

Reason:
M15B completes one browser checklist pass and automated stress coverage. Broader human
playtesting remains valuable but should not block stabilization.

Recommended milestone:
Continuous playtest after M16A transport foundation.

### LP-004 - Local hot-seat only

Severity: Low

Blocks M15B: No

Blocks Multiplayer: No

Reason:
M15B is deliberately single-browser stabilization. Network behavior starts in M16A.

Recommended milestone:
M16A.

---

## Won't Fix

### LP-013 - Full responsive mobile layout

Severity: Low

Blocks M15B: No

Blocks Multiplayer: No

Reason:
Mobile-responsive polish is outside the stable local baseline scope.

---

## Resolved During M15

### RESOLVED - Browser entry loaded test runner

Resolution:
`src/main.js` now imports the local play DOM bootstrap instead of `src/testRunner.js`.

### RESOLVED - ActionPanel needed browser payload injection

Resolution:
`ActionPanel` accepts an optional action creator. Browser-specific payload mapping lives
in `src/bootstrap/LocalActionInputAdapter.js`.

### RESOLVED - Session restart could leave stale panel content

Resolution:
`ActionPanel` clears child content during destroy/clear, and local session destroy owns
panel, subscription, controller, presentation, and runtime cleanup.

### RESOLVED - Local haunt needed a playable scenario id

Resolution:
`HauntManager` accepts a default-compatible `scenarioId` option. Existing callers still
default to `testScenario`.
