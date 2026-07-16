# Local Play Issues

Version: 1.0
Milestone: M15
Branch: `feature/local-play-integration`

---

## Current Blocking Issues

None recorded from automated integration coverage.

The local play shell builds and the deterministic integration test proves the required
normal flow through victory and restart.

---

## Known Non-blocking Issues

### LP-001 - Map rendering is diagnostic

Severity: Medium

Observed problem:
The map view is intentionally simple and optimized for proving integration, not final
player readability.

Impact:
Players can confirm room placement and player position, but the view is not yet a polished
board-game UI.

Recommended next step:
Handle in a UI integration polish milestone after manual localhost play identifies the
highest-friction interactions.

### LP-002 - Action target selection is basic

Severity: Medium

Observed problem:
Scenario actions use simple local DOM selectors for targets such as relics and exit.

Impact:
The action pipeline is correct, but target choice may feel mechanical or unclear to a
human player.

Recommended next step:
Improve scenario-specific affordances in the local play adapter or UI layer without adding
new `ActionType` values or changing `ScenarioActionHandler`.

### LP-003 - Manual browser pass still needs repeated human play

Severity: Medium

Observed problem:
Automated coverage proves the deterministic integration path, but it does not replace
multiple human localhost playthroughs.

Impact:
UX clarity, pacing, and player comprehension risks remain.

Recommended next step:
Run the checklist in `docs/LOCAL_PLAY_CHECKLIST.md` and record observed problems before
choosing UI polish or multiplayer synchronization work.

### LP-004 - Local hot-seat only

Severity: Low

Observed problem:
M15 implements local browser hot-seat integration only.

Impact:
There is no network lobby, remote player synchronization, reconnect, or authoritative
server behavior in this milestone.

Recommended next step:
Treat multiplayer synchronization as a later milestone only after the local playable flow
is stable enough to justify syncing.

---

## Resolved During M15

### RESOLVED - Browser entry loaded test runner

Resolution:
`src/main.js` now imports the local play DOM bootstrap instead of `src/testRunner.js`.

### RESOLVED - ActionPanel needed browser payload injection

Resolution:
`ActionPanel` now accepts an optional action creator. Browser-specific payload mapping
lives in `src/bootstrap/LocalActionInputAdapter.js`.

### RESOLVED - Session restart could leave stale panel content

Resolution:
`ActionPanel` clears child content during destroy/clear, and local session destroy owns
panel, subscription, controller, presentation, and runtime cleanup.

### RESOLVED - Local haunt needed a playable scenario id

Resolution:
`HauntManager` accepts a default-compatible `scenarioId` option. Existing callers still
default to `testScenario`.
