# M15 Development Report - Local Play Integration

Version: 1.0
Status: IMPLEMENTED
Branch: `feature/local-play-integration`

---

## 1. Mission

M15 connects the existing platform into a playable local browser flow:

```text
Create Local Game
  -> Explore
  -> Draw Omen
  -> Haunt Tracker / Roll / Trigger
  -> Scenario Runtime Factory
  -> Scenario Runtime
  -> PlayerAction
  -> Victory
  -> Restart
```

This milestone is an integration milestone. It does not add a multiplayer framework,
simulation framework, new scenario framework, new action type, or new victory API.

---

## 2. Implemented Flow

The browser entry point now starts the local play experience directly from `src/main.js`.
It no longer imports `src/testRunner.js`.

Implemented local flow:

| Step | Result |
|---|---|
| Create local game | Two unique characters are selected and spawned in the entrance room. |
| Explore | Movement into an unexplored direction adds a room to the graph and reveals it. |
| Draw Omen | The first deterministic room draws an omen card through the existing card trigger path. |
| Haunt trigger | Haunt tracker and roll controllers trigger the existing haunt manager. |
| Runtime factory | `ScenarioRuntimeFactory` creates the selected playable scenario runtime. |
| PlayerAction | Local DOM action input is converted into existing `PlayerAction` payloads. |
| Victory | Scenario victory is evaluated at session level and shown through `VictoryPanel`. |
| Restart | A new session can be created after destroying the previous local session. |

The debug start control is development-only and remains separate from the required
normal play path.

---

## 3. Integration Boundaries

M15 adds local-play wiring around existing systems:

```text
DOM Bootstrap
  -> LocalGameSession
  -> Existing Controllers
  -> Existing Runtime Factory
  -> Existing Scenario Runtime
  -> Existing Presentation Panels
```

Action payload mapping is handled in the local play bootstrap adapter:

```text
src/bootstrap/LocalActionInputAdapter.js
```

Victory orchestration is handled by the session integration:

```text
src/bootstrap/createLocalGameSession.js
```

`ActionPanel` only gained an injectable action creator so browser-specific payload mapping
does not become hardcoded presentation behavior.

---

## 4. Hot-seat Visibility

Hot-seat visibility is based on the active viewer:

```text
viewerId = currentPlayer.id
```

The local session passes viewer and traitor context into presentation queries. Automated
coverage verifies that Masked Host traitor-only objectives appear for the traitor viewer
and disappear when the view switches back to the hero.

---

## 5. Lifecycle Ownership

`LocalGameSession.destroy()` owns and releases:

```text
scenario runtime
presentation controller
exploration controllers
haunt controllers
local session subscriptions
presentation panels
runtime references
debug / DOM-facing session references
```

Restart coverage verifies that destroyed panels do not keep stale content and that action
dispatches are not duplicated after creating a new local session.

---

## 6. Files Changed

New local play bootstrap:

```text
src/bootstrap/createLocalGameDom.js
src/bootstrap/createLocalGameSession.js
src/bootstrap/LocalActionInputAdapter.js
src/bootstrap/LocalPlayDebugTools.js
```

Presentation integration:

```text
src/presentation/model/CharacterPresentationModel.js
src/presentation/panel/CharacterPanel.js
src/presentation/query/CharacterPresentationQuery.js
src/presentation/query/ActionAvailabilityQuery.js
src/presentation/query/CardPresentationQuery.js
src/presentation/query/ScenarioPresentationQuery.js
src/presentation/ActionPanel.js
```

Entry and styling:

```text
src/main.js
src/style.css
```

Test coverage:

```text
src/test/LocalPlayIntegrationTest.js
src/testRunner.js
```

Minor default-compatible integration parameter:

```text
src/controller/HauntManager.js
```

---

## 7. Regression Results

Automated test command:

```text
node src/testRunner.js
```

Result:

```text
PASS
Local Play Integration Test: 26 passed, 0 failed
```

Production build command:

```text
npm run build
```

Result:

```text
PASS
vite build completed successfully
```

Note:
The first sandboxed build attempt failed with `spawn EPERM` while starting esbuild.
The build passed when rerun outside the sandbox with approval.

---

## 8. Architecture Review

Forbidden framework diff:

```text
ScenarioRuntime API: none
Victory Framework API: none
InformationRouter API: none
ActionType: none
ActionValidator: none
ScenarioActionHandler: none
GraphMap: none
Save / Load framework: none
Bundle framework: none
```

M15 changes are integration, presentation wiring, and local browser bootstrap changes.
`HauntManager` gained a default-compatible `scenarioId` option so the local integration
can start an existing playable scenario instead of the legacy test scenario.

---

## 9. Remaining Risks

M15 establishes a working local integration baseline, not final UX polish.

Remaining risks:

```text
Manual browser playthrough still needs repeated human passes.
Map rendering is intentionally simple and diagnostic.
Action target selection is basic and should be refined after real local play.
Only local hot-seat behavior is covered; network synchronization is not implemented.
```

Next milestone should be selected from real localhost play observations, with likely
candidates being UI integration polish or local multiplayer synchronization.
