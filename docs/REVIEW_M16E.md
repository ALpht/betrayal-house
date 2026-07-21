# M16E Development Report - LAN Multiplayer Playability Hardening

Milestone: M16E - LAN Multiplayer Playability Hardening
Branch: `feature/lan-multiplayer-playability`

---

## 1. Result

```text
Implementation: COMPLETE
Focused Tests: PASS
Full Regression: PASS
Production Build: PASS
Architecture Freeze: PRESERVED
Manual Browser Smoke: PASS
Remaining Code Blockers: NONE
```

M16E makes the existing M16C/D LAN multiplayer baseline usable from browser UI. The
work stays in browser playability, UI integration, and lifecycle hardening. It does not
add reliable delivery, action replay, projection replay, host migration, server gameplay
authority, multi-guest support, authentication, or a generic multiplayer framework.

---

## 2. Delivered Work

M16E adds:

- Local / Host LAN / Join LAN entry flow.
- Top-level `createGameApplication()` ownership.
- Host and Guest LAN bootstrap ownership.
- Passive multiplayer DOM panels.
- Immutable presentation-only UI model.
- Viewer-safe disabled reason presentation.
- Room code display with non-blocking clipboard fallback.
- Host start double-submit guard.
- Guest join double-submit guard.
- Guest reconnect presentation.
- Pending-action uncertainty warning.
- Explicit Guest leave.
- Host close room.
- New LAN Game as close-and-create-new-room.
- M16E focused UI and lifecycle regression tests.
- LAN multiplayer playability documentation.

---

## 3. Architecture Boundary

Approved responsibility model:

```text
createGameApplication
= top-level mode and app ownership

Host / Guest Bootstrap
= socket, lobby, transport, session, UI controller, cleanup ownership

MultiplayerUiController
= external state to derived presentation model

MultiplayerUiModel
= presentation-only allowlisted state

Panels
= passive DOM rendering and user intent callbacks
```

Panels do not own Socket.io clients, LobbyClient, SocketTransportEndpoint, multiplayer
sessions, local runtime, router, or gameplay state.

---

## 4. Protocol Changes

M16E adds two minimal lobby control messages:

```text
LEAVE_ROOM
CLOSE_ROOM
```

These messages only distinguish intentional browser actions from unexpected socket
disconnect. They are not a generic presence, kick, ban, or disconnect-reason framework.

Guest `LEAVE_ROOM` does not enter reconnect grace.

Host `CLOSE_ROOM` sends the close request before local socket cleanup so the Guest can
receive terminal closure.

---

## 5. Development Issues And Fixes

### Issue 1 - Repeated Start After ACTIVE

Observed:

```text
Start guard blocked pending request, but did not block a direct repeated activation
after the session became ACTIVE.
```

Fix:

```text
Host startSession now also rejects when lobby state is already ACTIVE.
```

Result:

```text
Repeated Start sends one activation request.
```

### Issue 2 - Read-only Navigator In Test Environment

Observed:

```text
Clipboard fallback test could not assign global.navigator directly.
```

Fix:

```text
Use Object.defineProperty for a configurable navigator clipboard stub.
```

Result:

```text
Clipboard failure remains non-blocking and room code stays visible.
```

### Issue 3 - Default Disconnected State In Session UI Test

Observed:

```text
Action enabled test was blocked by default DISCONNECTED lifecycle state.
```

Fix:

```text
Set connectionState = CONNECTED in the test precondition.
```

Result:

```text
Test now validates action behavior under a valid connected session state.
```

### Issue 4 - DOM Shim Pollution

Observed:

```text
Older tests installed a smaller document shim. M16E tests required append and
replaceChildren, causing order-dependent full-runner failures.
```

Fix:

```text
M16E TestDom installs a complete test DOM shim when invoked.
```

Result:

```text
Full testRunner passes with old and new tests in sequence.
```

### Issue 5 - Build EPERM

Observed:

```text
npm run build failed with esbuild spawn EPERM.
```

Fix:

```text
Re-ran build with authorized execution.
```

Result:

```text
Production build passed.
```

### Issue 6 - Host Server Port Correction

Observed:

```text
The plan example used port 3000, but the actual socket server default is 3001.
```

Fix:

```text
UI and documentation use http://localhost:3001 and http://<HOST_LAN_IP>:3001.
```

Result:

```text
Guest LAN UI points at the real socket server.
```

---

## 6. Validation

Focused tests:

```text
MultiplayerLobbyUiTest        PASS
MultiplayerSessionUiTest      PASS
MultiplayerReconnectUiTest    PASS
MultiplayerUiLifecycleTest    PASS
```

Full regression:

```text
node src/testRunner.js
PASS
```

Production build:

```text
npm run build
PASS
```

Diff checks:

```text
git diff --check
PASS

Frozen Platform diff
EMPTY
```

Frozen areas remain unchanged:

```text
src/scenario
src/data
src/save
src/model/GraphMap.js
ActionValidator
ScenarioActionHandler
ScenarioRuntime
Victory Framework
InformationRouter
```

---

## 7. Manual Browser Smoke Test

Environment:

```text
Frontend:
http://127.0.0.1:5173/

Socket server:
http://127.0.0.1:3001
```

Manual smoke results:

```text
Flow A - Entry and mode ownership: PASS
Flow B - Create and join: PASS
Flow C - Session start: PASS
Flow D - Close and New Game: PASS
Flow E - Explicit leave: PASS
Flow F - Physical / controlled reconnect smoke: PASS
Browser console: PASS
```

Evidence:

```text
Initial room code:
UBE5

New LAN Game room code:
B9TF
```

Observed browser checks:

- Entry renders Local Hot-seat, Host LAN Game, and Join LAN Game.
- Local mode opens existing local play UI.
- Host mode replaces local UI.
- Join mode opens Host Server Address and Room Code inputs.
- Host creates selectable room code.
- Start is disabled before Guest ready.
- Guest joins using `http://localhost:3001`.
- Guest sees waiting-for-Host state.
- Host sees Guest connected.
- Start is enabled after Guest ready.
- Host and Guest roles render.
- Guest assigned player renders.
- Current player renders.
- Disabled reason is visible for unavailable actions.
- Guest explicit leave returns to entry.
- Host does not remain stuck in reconnecting after explicit leave.
- New LAN Game creates a different room code.
- Old room code cannot rejoin active game.
- No captured browser console error logs in Host or Guest tab.

Physical / Controlled Reconnect Smoke:

```text
PASS
```

Verified:

```text
Guest entered RECONNECTING
Host observed Guest reconnecting
Session resumed within grace period
Player binding preserved
Latest projection restored
No action replay occurred
Gameplay continued successfully
Browser console remained clean
```

---

## 8. Deferred Scope

Still deferred:

```text
Same-room restart
Reliable delivery
Action replay
Projection replay
Page refresh resume
Host reconnect
Host migration
Persistent token storage
Multi-guest
Authentication
Matchmaking
Server gameplay authority
Full visual polish
Mobile LAN UI
```

---

## 9. Final Assessment

```text
M16E Implementation: APPROVED
Automated Validation: PASSED
Manual Browser Smoke A-F: PASSED
Manual Reconnect Network Interruption: PASSED
Architecture Freeze: PRESERVED
Remaining Code Blockers: NONE
```

Recommended next step:

```text
M16E is ready for merge and closure.
```
