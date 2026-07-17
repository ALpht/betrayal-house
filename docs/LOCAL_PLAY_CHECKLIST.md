# Local Play Checklist

Version: 2.0
Milestone: M15B
Branch: `feature/local-play-stabilization`

---

## Automated Gate

| Check | Status | Evidence |
|---|---:|---|
| Test runner passes | PASS | `node src/testRunner.js` |
| Local play integration test passes | PASS | `Local Play Integration Test: 26 passed, 0 failed` |
| Production build passes | PASS | `npm run build` |
| Browser entry does not import test runner | PASS | `src/main.js` imports local play bootstrap only |
| Normal path creates scenario runtime | PASS | Automated flow explores, draws omen, triggers haunt, creates `relicEscape` |
| Victory path works | PASS | Automated flow collects relics, moves to exit, shows hero victory |
| Restart cleanup works | PASS | Destroyed panels remain clear and dispatch is not duplicated |
| Hot-seat hidden info changes by current viewer | PASS | Masked Host traitor-only objective is isolated |
| Restart stress passes | PASS | `Local Play Stability Test: 26 passed, 0 failed` |
| Victory lock prevents mutation | PASS | Dispatch count and scenario snapshot remain unchanged after victory |
| Old DOM controls are inert | PASS | Old button reference does not dispatch after destroy |

---

## Manual Browser Smoke Checklist

Run from localhost after `npm run dev`.

| Step | Expected Result | Status |
|---|---|---:|
| Open the app | Local play shell is visible, not a test runner page. | READY |
| Select two different characters | Start button remains usable and creates two unique players. | READY |
| Start local game | Entrance room, current player, character panel, and turn panel appear. | READY |
| Click an explore direction | A new room appears on the map and the active player moves. | READY |
| Enter omen room | Omen card appears and haunt flow starts. | READY |
| Haunt triggers | Scenario panel appears for the started scenario. | READY |
| Use scenario actions | Action buttons dispatch existing `PlayerAction` objects. | READY |
| Complete Relic Escape | Collect three unique relics, then move to exit for hero victory. | READY |
| After victory | Actions are disabled and victory result is shown. | READY |
| Restart | New game starts without duplicated actions or stale panel content. | READY |
| Switch turns in hidden-info scenario | Viewer-specific private objective changes with current player. | READY |

---

## M15B Stabilization Checklist

Run from localhost after `npm run dev`.

| Step | Expected Result | Status |
|---|---|---:|
| Create game | Local play shell starts a two-player game with current player visible. | PASS |
| Explore | Direction buttons move or explain unavailable movement. | PASS |
| Reveal room | Revealed room is visible on the map with current room emphasis. | PASS |
| Draw card | Latest visible card is clearly labeled. | PASS |
| Trigger haunt | Omen flow starts a playable scenario without console use. | PASS |
| Scenario playable | Available actions and static target selectors are understandable. | PASS |
| Victory | Victory message appears and actions are disabled. | PASS |
| Restart | New session replaces old session without stale panel content. | PASS |
| 10 consecutive restarts | No duplicate dispatch, stale runtime, or stale DOM controls. | PASS |
| Browser console clean | No blocker or high-severity console error observed in M15B pass. | PASS |

---

## Required Normal Flow

The M15 merge gate requires the normal browser path to prove:

```text
Create local game
Explore
Draw Omen
Haunt Tracker / Roll / Triggered
Runtime Factory
Scenario
PlayerAction
Victory
Restart
```

The development-only debug start button may be used for diagnosis, but it does not replace
the normal flow checklist.

---

## Notes for Reviewers

The first browser pass should focus on whether the local flow is understandable enough to
play, not on visual polish.

Record any issue in `docs/LOCAL_PLAY_ISSUES.md` using:

```text
Observed problem
Reproduction
Expected behavior
Actual behavior
Severity
Suggested next milestone
```
