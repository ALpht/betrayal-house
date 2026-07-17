# M15B Development Report - Local Play Stabilization & UX Fixes

Version: 1.0
Status: IMPLEMENTED
Branch: `feature/local-play-stabilization`

---

## 1. Mission

M15B hardens the M15 local browser prototype into a stable single-browser localhost
baseline before multiplayer work begins.

Implementation rule:

```text
Observed Problem
  -> Smallest Local Fix
  -> Automated Regression
  -> Manual Verification
```

No gameplay, scenario, content, runtime, save/load, bundle, or multiplayer capability was
added.

---

## 2. Fixed Issues

| Issue | Result |
|---|---|
| LP-005 | Old action buttons now become inert after panel destroy. |
| LP-006 | Restart stress is covered for 10 cycles. |
| LP-007 | Victory lock now has dispatch-count and snapshot regression coverage. |
| LP-008 | Hot-seat turn switch refreshes current player and removes private text. |
| LP-009 | Latest visible card is explicitly labeled. |
| LP-010 | Static target selectors use clearer labels and help text. |
| LP-011 | Map readability improved through presentation-only canvas/CSS changes. |
| LP-012 | Docs now separate M15 integration, M15B stabilization, and M16 multiplayer. |

---

## 3. Stabilization Evidence

Automated coverage added:

```text
src/test/LocalPlayStabilityTest.js
```

Verified cases:

```text
Restart x10
Old DOM button inert after destroy
Runtime identity replaced after restart
Victory blocks dispatch and state mutation
Hot-seat private information removed on viewer change
Second game remains playable after restart
```

Result:

```text
Local Play Stability Test: 26 passed, 0 failed
```

---

## 4. Test-time Issues and Fixes

### Issue A - Fake DOM missing `removeEventListener`

Observed Problem:
After updating `ActionButton.remove()` to remove retained click handlers, the existing
Node-based fake DOM tests failed during `LocalPlayIntegrationTest` and the first
`LocalPlayStabilityTest` run.

Evidence:

```text
Local play main flow threw this[#element].removeEventListener is not a function
Local play visibility threw this[#element].removeEventListener is not a function
Restart stress threw this[#element].removeEventListener is not a function
```

Cause:
Some test fake DOM elements supported `addEventListener` and `click`, but did not provide
`removeEventListener`. The browser implementation supports it, but the test environment was
less complete.

Smallest Fix:
`ActionButton` now checks whether `removeEventListener` exists before calling it. It also
wraps click handlers with an internal active-handler guard so stale fake DOM button
references become inert even when the fake element cannot physically remove the listener.

Regression Result:

```text
Local Play Integration Test: 26 passed, 0 failed
Local Play Stability Test: 26 passed, 0 failed
```

Remaining Risk:
None for M15B. The fix is presentation-local and does not affect gameplay dispatch rules.

### Issue B - Browser locator matched two `Collect` candidates

Observed Problem:
During manual browser smoke testing, the first broad role locator for `Collect` failed:

```text
button Collect count=2
```

Cause:
The browser accessibility locator was broader than the intended action panel scope. DOM
inspection showed only one real `.local-actions` `Collect` button. The duplicate count came
from locator ambiguity, not duplicated action panel rendering.

Evidence:

```text
.local-actions HTML:
<button>Collect</button>
<button disabled title="Collect all relics first">Move</button>
<button>End Turn</button>
```

Smallest Fix:
The implementation did not need a code change. The manual verification procedure was
adjusted to scope interactions to `.local-actions button`, which matches how the M15B
regression reasons about duplicate action controls.

Regression Result:

```text
Victory flow completed
Heroes Win shown
Collect / Move / End Turn disabled after victory
Restart x10 completed
Action button count remained 3
Browser console error/warn count: 0
```

Remaining Risk:
None for M15B. This was a browser test locator issue, not a local play lifecycle issue.

### Issue C - Sandboxed build blocked esbuild spawn

Observed Problem:
`npm run build` failed inside the sandbox.

Evidence:

```text
Error: spawn EPERM
failed to load config from vite.config.js
```

Cause:
The sandbox blocked Vite/esbuild from spawning its build service.

Smallest Fix:
Rerun the same build command with approved elevated execution. No source change was made.

Regression Result:

```text
vite build completed successfully
113 modules transformed
```

Remaining Risk:
None in project code. This is an execution-environment limitation.

---

## 5. UX Changes

Local play UX was clarified without adding framework behavior:

```text
Current card: latest visible card label in CardPanel
Target selectors: clearer static labels and option text
Map: current room highlight, current player marker, reveal distinction
Movement: user-facing movement feedback text
Disabled actions: disabled reason exposed as tooltip / aria label
```

Target selectors remain static DOM inputs. They do not inspect scenario state and do not
add target-discovery APIs.

---

## 6. Architecture Freeze Review

Forbidden areas unchanged:

```text
ScenarioRuntime API: none
Scenario Framework: none
Victory Framework: none
InformationRouter: none
ActionType: none
ActionValidator: none
ScenarioActionHandler: none
GraphMap: none
Save / Load: none
Bundle System: none
Scenario Definition Contract: none
Scenario/content values: none
Multiplayer infrastructure: none
```

Allowed areas used:

```text
src/bootstrap/
src/presentation/
src/style.css
src/test/
docs/
```

---

## 7. Verification

Required commands:

```text
node src/testRunner.js
npm run build
```

Actual result:

```text
PASS
Local Play Integration Test: 26 passed, 0 failed
Local Play Stability Test: 26 passed, 0 failed
vite build completed successfully
```

Manual browser checklist:

```text
Create game
Explore
Reveal room
Draw card
Trigger haunt
Scenario playable
Victory
Restart
10 consecutive restarts
Browser console clean
```

Actual browser result:

```text
PASS
Latest visible card displayed
Relic Escape reached through normal explore / omen / haunt flow
Heroes Win shown after three relics and exit
All scenario action buttons disabled after victory
Restart x10 remained playable
Action button count after restart stress: 3
Browser console error/warn count: 0
```

---

## 8. Remaining Risks

Deferred issues do not block M15B or M16 multiplayer:

```text
Static target selectors may need richer labels after more playtesting.
More human play sessions may find UX polish opportunities.
Network multiplayer remains intentionally unimplemented until M16A.
```

M15B completion means the single-browser localhost baseline is stable enough to become
the control case for future multiplayer synchronization defects.
