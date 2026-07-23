# M16F Development Report - Dedicated Host & Multi-Guest LAN Foundation

Milestone: M16F - Dedicated Host & Multi-Guest LAN Foundation
Branch: `feature/dedicated-host-multi-guest`
Final post-development report: `docs/M16F_POST_DEVELOPMENT_REPORT.md`

## 1. Final Status

```text
Implementation: COMPLETE
Focused Tests: PASS
Full Regression: PASS
Production Build: PASS
Architecture Freeze: PRESERVED
Manual Multi-device LAN Smoke: PASS
Owner Acceptance: COMPLETE (2026-07-23)
Controlled Localhost Multi-tab Smoke: PASS
Controlled LAN-address Multi-tab Smoke: PASS
Remaining Code Blockers: NONE
```

M16F successfully moves LAN multiplayer from the M16E one-Host / one-Guest browser
playability baseline to a Dedicated Host plus fixed 2-3 Guest player model.

The Host remains the only gameplay authority, but the Host is no longer a player,
viewer, bound character, or action sender. All gameplay participants are Guests.

The Host socket process now detects its private LAN IPv4 address and publishes it in
the initial lobby handshake. A Host page opened through `localhost` therefore renders
a mobile-reachable QR URL automatically; manual Host-address entry is no longer part
of the normal setup flow.

## 2. Scope Delivered

### Dedicated Host

- Host has no `playerId`.
- Host has no viewer binding.
- Host has no action controls.
- Host does not receive private per-player projection.
- Host remains responsible for room creation, session start, authoritative runtime,
  binding assignment, state publishing, and room closure.

### Multi-Guest Lobby

- Room `playerCount` is fixed at creation time.
- Supported room sizes are 2 or 3 Guest players.
- `playerCount` represents both required players and room capacity.
- Room lifecycle is limited to:

```text
WAITING_FOR_PLAYERS
ACTIVE
CLOSED
```

- Start readiness is derived from roster state, not stored as an independent room
  status.

### Public Roster

Each roster member now separates:

```text
membershipState
connectionState
readiness
guestId
currentConnectionId
```

The public roster DTO intentionally excludes:

```text
resumeToken
raw binding
socket metadata
runtime
router
snapshot
projection internals
private information
```

### Stable Guest Identity

- `guestId` is stable across reconnect.
- `currentConnectionId` is replaceable.
- Player binding is keyed by stable Guest identity.
- Action sequence consumption remains tied to the stable Guest binding, not the
  temporary socket connection.

### Per-Guest Projection Fanout

- Host publishes viewer-safe projection per connected Guest.
- Reconnecting Guests do not receive queued projections.
- Resume rebuilds and sends the latest projection.
- No reliable delivery, action replay, or projection replay was added.

### Active Leave

Explicit Guest leave during an active session is terminal:

```text
PLAYER_LEFT_ACTIVE_SESSION
```

This does not create a gameplay `VictoryResult`.

## 3. Files And Areas Changed

Allowed M16F implementation areas were used:

```text
server/
src/bootstrap/
src/multiplayer/
src/test/
docs/
```

New key files:

```text
server/MultiplayerRoomRoster.js
src/multiplayer/session/MultiplayerPlayerBindingRegistry.js
src/test/DedicatedHostSeparationTest.js
src/test/MultiGuestLobbyTest.js
src/test/MultiGuestActionSyncTest.js
docs/DEDICATED_HOST_CONTRACT.md
docs/MULTI_GUEST_SESSION_CONTRACT.md
docs/M16F_MANUAL_TEST_PLAN.md
```

Updated contract documents:

```text
docs/ROADMAP.md
docs/ARCHITECTURE.md
docs/CONSTRAINTS.md
docs/EVENT_CATALOG.md
docs/MULTIPLAYER_LOBBY_CONTRACT.md
docs/MULTIPLAYER_SESSION_CONTRACT.md
docs/MULTIPLAYER_RECONNECT_CONTRACT.md
docs/TECH_DEBT.md
```

## 4. Automated Test Evidence

Focused M16F tests:

```text
DedicatedHostSeparationTest PASS
MultiGuestLobbyTest         PASS
MultiGuestActionSyncTest    PASS
MultiGuestBrowserSmokeRegressionTest PASS
```

Updated M16 socket regressions:

```text
SocketTransportTest                 PASS
MultiplayerSocketIntegrationTest    PASS
MultiplayerResumeIntegrationTest    PASS
MultiplayerReconnectTest            PASS
MultiplayerLobbyUiTest              PASS
```

Full regression:

```text
node src/testRunner.js
PASS
```

Production build:

```text
npm.cmd run build
PASS
```

## 5. Issues Found During Testing

### Issue 1 - Long Socket Waits

Observed Problem:

```text
Full regression could appear to run for too long when a socket event expected by an
old single-Guest test never occurred under the new M16F multi-Guest contract.
```

Evidence / Reproduction:

```text
Socket integration tests waited for events that were previously guaranteed in the
one-Guest model, but M16F now requires fixed playerCount, all Guests joined,
all Guests ready, and target-specific delivery.
```

Root Cause:

```text
Some async test helpers did not have bounded event waits. A missing event therefore
looked like a slow integration test instead of a fast contract failure.
```

Fix:

```text
Added bounded request and socket event timeouts.
```

Implementation:

```text
LobbyClient request timeout: 1000ms
Socket test event timeout: 1000ms
Integration waitUntil timeout: bounded per test case
```

Result:

```text
Contract mismatches now fail quickly instead of hanging the full runner.
Full regression completes normally.
```

Remaining Risk:

```text
Timeout values are intentionally short for local deterministic tests. Real LAN UX
still requires physical multi-device smoke testing.
```

### Issue 2 - Old Single-Guest Lobby Assumptions

Observed Problem:

```text
Existing tests expected one Guest, guestClientId as the only routing identity,
stored READY room state, and room-level RECONNECTING.
```

Evidence / Reproduction:

```text
M16F focused work caused old socket and reconnect tests to fail because the room
could no longer activate after only one Guest joined.
```

Root Cause:

```text
M16F intentionally changes the LAN product model from Host + one Guest to Dedicated
Host + fixed 2-3 Guest players.
```

Fix:

```text
Updated affected tests to create the correct playerCount, join all required Guests,
mark Guests ready, and validate per-member reconnect state.
```

Result:

```text
Old M16A-E transport and reconnect guarantees remain covered while M16F's
multi-Guest contract is now enforced.
```

Remaining Risk:

```text
Multi-device browser smoke is still needed to verify real LAN timing and user flow.
```

### Issue 3 - Host Binding Assumption

Observed Problem:

```text
Some previous paths assumed the Host could have a player binding or viewer state.
```

Evidence / Reproduction:

```text
Dedicated Host separation tests required Host binding lookups to return null while
Guest bindings remained valid and action-capable.
```

Root Cause:

```text
Before M16F, the local browser Host could still behave like a participant in some
LAN session assumptions.
```

Fix:

```text
Separated Host authority from player identity and added a multi-Guest binding
registry keyed by stable guestId.
```

Result:

```text
Host no longer owns player identity. Guests receive player bindings and projections.
Actions remain Guest-owned and Host-validated.
```

Remaining Risk:

```text
Future Host dashboard work must remain observer/control UI only and must not add
Host gameplay participation without owner review.
```

### Issue 4 - Build Runner Permission Error

Observed Problem:

```text
npm.cmd run build failed once with an esbuild spawn EPERM error in the managed
sandbox.
```

Evidence / Reproduction:

```text
The failure occurred during production build execution, before any M16F-specific
runtime assertion failed.
```

Root Cause:

```text
Local sandbox process permissions blocked the build tool spawn.
```

Fix:

```text
Reran the production build with the required execution permission.
```

Result:

```text
npm.cmd run build
PASS
```

Remaining Risk:

```text
None for code correctness. This is an environment execution issue, not an M16F
implementation defect.
```

## 6. Architecture Freeze Verification

Frozen platform diff:

```text
src/scenario/
src/data/
src/save/
src/model/GraphMap.js
ActionValidator
ScenarioActionHandler
ScenarioRuntime
InformationRouter

NO DIFF
```

Diff check:

```text
git diff --check
PASS

Only Windows LF -> CRLF normalization warnings were reported.
No whitespace errors were found.
```

No scenario rule, gameplay runtime, action validator, save/load, bundle, content
value, or scenario framework change was made.

## 7. Manual Verification Status

Manual plan added:

```text
docs/M16F_MANUAL_TEST_PLAN.md
```

Still pending:

```text
Physical multi-device LAN smoke
```

Required manual coverage:

```text
1 Dedicated Host browser
2 Guest browsers or devices
Optional 3 Guest room
Room creation
Roster readiness
Session start
Per-Guest assigned player display
Turn/action synchronization
Per-Guest reconnect
Explicit active leave
Room closure
Browser console clean
```

This pending item is not a code blocker, but it should remain the final closure
gate before declaring M16F fully verified in real LAN conditions.

## 8. Merge Gate Status

```text
[x] Branch based on current multiplayer roadmap
[x] Dedicated Host has no player identity
[x] Fixed 2-3 Guest room capacity
[x] Roster membership, connection, and readiness are separated
[x] Public roster exposes no private data
[x] Stable guestId survives reconnect
[x] currentConnectionId is replaceable
[x] Player bindings are per Guest
[x] Per-viewer projection fanout works
[x] Reconnecting Guest receives latest rebuilt projection after resume
[x] Explicit active leave is terminal
[x] No action replay added
[x] No projection replay added
[x] No reliable delivery layer added
[x] No server gameplay added
[x] Focused tests pass
[x] Full regression passes
[x] Production build passes
[x] Frozen platform diff empty
[ ] Physical multi-device LAN smoke completed
```

## 9. Controlled Localhost Smoke Run - 2026-07-22

This run used one local browser session with three tabs to simulate:

```text
1 Host tab
1 Guest A tab
1 Guest B tab
Socket server: http://127.0.0.1:3001
Vite app: http://127.0.0.1:5173
Room Code: BPE4
```

This is not a substitute for the physical multi-device LAN smoke, but it is valid
for catching browser integration blockers before the physical run.

### Passed

```text
Socket server started on port 3001
Vite app started on port 5173
Host entered Host LAN Game mode
Host created 2-player room
Guest A joined with display name
Guest A marked Ready
Host roster showed Guest A as CONNECTED | READY
Guest B joined with display name
Guest B marked Ready
Host roster showed 2/2 players joined
Start Session became enabled
Session started
Guest A received Assigned player: Brandon Jaspers
Guest B received Assigned player: Ox Bellows
Guest B saw NOT_YOUR_TURN style disabled state
```

### Failed

#### Failure 1 - Host Still Renders Local Player Presentation

Observed:

```text
After session start, Host LAN Status correctly showed:

Role: HOST
Assigned player: Loading
Current player: Unknown

But the Host page still rendered a local game presentation below the LAN panels:

Current Character: Brandon Jaspers
Scenario: Exploration
Objective: Explore rooms and draw omen cards.
Local game started
```

Expected:

```text
Dedicated Host must not display player identity, private player projection, or
local player presentation.
```

Impact:

```text
Blocks M16F physical LAN smoke.
Violates Dedicated Host separation.
```

Proposed Fix:

```text
Do not mount or retain local player presentation inside Host LAN mode after
session start. Host may show roster/session authority status only, using public
or host-safe observer data.
```

Forbidden Fix:

```text
Do not change ScenarioRuntime, InformationRouter, presentation framework, or
gameplay projection rules to hide this. The fix belongs in Host LAN UI/bootstrap
ownership.
```

#### Failure 2 - Guest Current Player Has No Browser Action Controls

Observed:

```text
Guest A was assigned Brandon Jaspers and was the current player, but the browser
UI only showed LAN Status and Session panels. No action controls were available.
```

Expected:

```text
The current Guest player must be able to perform at least one valid player action
from the browser UI without console/debug access.
```

Impact:

```text
Blocks Manual Smoke Flow B - Turn And Action Synchronization.
Blocks validation of duplicate dispatch, per-viewer state update, and real
browser gameplay continuation.
```

Proposed Fix:

```text
Wire Guest LAN session UI to existing viewer-safe action presentation so the
current Guest can submit permitted actions. Keep legality derived from existing
projection/session contracts. Do not inspect gameplay internals from UI.
```

Forbidden Fix:

```text
Do not add new gameplay actions, duplicate ActionValidator, or expose runtime
internals to the Guest UI.
```

#### Failure 3 - Active Leave Leaves Stale / Inconsistent UI State

Observed:

```text
Guest B explicit Leave Room during ACTIVE returned Guest B to entry.

Guest A received:
A player left the active session.
A player left the active session.

Host showed:
Connection: DISCONNECTED
Lobby: CLOSED
Session: WAITING_TO_START

Host also retained the stale local game presentation.
Guest A retained stale Assigned player and Current player values after terminal
closure.
```

Expected:

```text
Active leave should close the room with PLAYER_LEFT_ACTIVE_SESSION exactly once
per affected viewer, remove active action/session capability, and clear or mark
stale gameplay presentation consistently.
```

Impact:

```text
Blocks Manual Smoke Flow E - Active Leave.
Creates confusing terminal UI state for Host and remaining Guests.
```

Proposed Fix:

```text
Deduplicate terminal close messaging.
Keep Host connection/lobby lifecycle display consistent with intentional room
closure.
Clear or explicitly terminalize Guest assignment/current-player presentation after
active session closure.
Ensure stale Host local game DOM is destroyed as part of terminal cleanup.
```

Forbidden Fix:

```text
Do not convert active leave into VictoryResult.
Do not add reconnect grace for explicit leave.
Do not add a new generic lifecycle framework.
```

### Not Completed Because Of Blockers

```text
Guest valid action dispatch
All-Guest projection update after action
Private projection isolation after real browser action
Independent reconnect
3-player optional room flow
Fourth Guest ROOM_FULL browser validation
Physical multi-device LAN smoke
```

### Revised Status After Smoke Run

```text
M16F CONTROLLED LOCALHOST SMOKE:
FAILED

M16F IMPLEMENTATION:
NEEDS FIXES

CODE BLOCKERS:
YES

PHYSICAL MULTI-DEVICE LAN SMOKE:
BLOCKED UNTIL LOCALHOST SMOKE PASSES
```

## 10. Integration Fixes And Rerun - 2026-07-22

After the failed controlled localhost smoke, M16F received focused browser
integration fixes only.

### Fix 1 - Dedicated Host Composition

Change:

```text
Host LAN app no longer mounts local player presentation containers.
```

Result:

```text
Host remains authoritative runtime owner but does not render:

Current Character
Local game started
local player action panel
private player presentation
```

### Fix 2 - Guest Action Surface

Change:

```text
Guest LAN app now immediately applies existing Guest session state when the
session subscription is attached.
Host LAN browser activation starts the existing relicEscape scenario before
publishing the initial Guest projection.
Guest action clicks now send a complete PlayerAction-shaped payload with id,
type, playerId, and payload.
```

Result:

```text
Current Guest renders enabled scenario actions.
END_TURN can be submitted from the browser.
Host dispatches the action once.
Both Guests receive updated current-player projection.
```

### Fix 3 - Active Leave Terminal Cleanup

Change:

```text
SESSION_CLOSED destroys Host session ownership.
Guest terminal closure clears projection, actions, assigned player, current
player, pending/uncertain action state, and renders one terminal message.
```

Result:

```text
No stale Host local game panel remains.
Remaining Guest receives one PLAYER_LEFT_ACTIVE_SESSION message.
Remaining Guest no longer keeps stale assigned/current player text.
```

### Added Regression

```text
MultiGuestBrowserSmokeRegressionTest
```

Coverage:

```text
Host LAN app does not mount local player presentation.
Current Guest renders enabled action control.
Guest action control sends complete PlayerAction payload.
Active leave clears stale Guest session presentation.
```

### Controlled Localhost Smoke Rerun

Setup:

```text
Socket server: http://127.0.0.1:3001
Vite app: http://127.0.0.1:5173
Host tab + Guest A tab + Guest B tab
Room Code: QPN6
```

Result:

```text
Host creates room: PASS
Host roster reaches 2/2: PASS
Both Guests ready in roster: PASS
Host has no local player presentation: PASS
Guest A assigned Brandon Jaspers: PASS
Guest B assigned Ox Bellows: PASS
Guest A receives Relic Escape projection: PASS
Guest A has enabled END_TURN: PASS
END_TURN updates current player on Guest B: PASS
Guest A becomes non-current after action: PASS
Host no stale local game panel after leave: PASS
Guest A terminal message not duplicated: PASS
Guest A clears stale assignment/current player: PASS
```

Revised status:

```text
M16F CONTROLLED LOCALHOST SMOKE:
PASS

M16F IMPLEMENTATION:
COMPLETE

CODE BLOCKERS:
NONE

PHYSICAL MULTI-DEVICE LAN SMOKE:
READY
```

## 11. Final Decision

```text
M16F IMPLEMENTATION: COMPLETE
AUTOMATED VALIDATION: PASSED
ARCHITECTURE FREEZE: PRESERVED
CODE BLOCKERS: NONE
CONTROLLED LOCALHOST SMOKE: PASS
FINAL MANUAL LAN SMOKE: PENDING
```

Recommended status:

```text
APPROVED FOR PHYSICAL LAN VALIDATION
```

After the physical LAN smoke passes, M16F can be updated to:

```text
APPROVED FOR MERGE
APPROVED FOR CLOSURE
```

## 12. Owner Review Addendum - Browser Integration Fixes Accepted

Owner review confirms the browser integration blockers found during the first
controlled localhost smoke run have been fixed.

```text
M16F IMPLEMENTATION:
COMPLETE

AUTOMATED TESTS:
PASS

CONTROLLED LOCALHOST MULTI-TAB SMOKE:
PASS

PRODUCTION BUILD:
PASS

ARCHITECTURE FREEZE:
PRESERVED

CODE BLOCKERS:
NONE

PHYSICAL MULTI-DEVICE LAN SMOKE:
READY / PENDING
```

The previous status:

```text
REQUEST CHANGES
NOT READY FOR PHYSICAL LAN SMOKE
```

is revoked.

Current review decision:

```text
APPROVED FOR PHYSICAL LAN VALIDATION
```

Not yet approved:

```text
APPROVED FOR CLOSURE
```

### Accepted Fixes

Dedicated Host separation:

```text
Host has no local player presentation
Host does not retain stale local game panel
```

Guest gameplay action flow:

```text
Guest A receives projection
Guest A renders enabled END_TURN
Guest A sends action
Host executes authoritative action
Guest B receives updated current player
Guest A becomes non-current
```

Active leave terminal cleanup:

```text
Host stale local game panel cleared
Guest A terminal message emitted once
Guest A stale assignment cleared
Guest A stale current player cleared
```

### Regression Requirement

`MultiGuestBrowserSmokeRegressionTest` should remain browser-facing and must not
be reduced to session-object-only assertions during later refactors.

It should continue to protect:

```text
Host has no player UI
Current Guest has enabled action
Action updates relevant Guest views
Old current player becomes non-current
Active leave clears Host and remaining Guest state
Terminal message is not duplicated
```

### Remaining Closure Gate

Physical multi-device LAN smoke should verify:

```text
Room creation over LAN
Guest A/B join over LAN
Roster and Ready synchronization
Session start
Unique assignments
Guest action submission
Turn projection update
Private projection isolation
One Guest network interruption and resume
Active leave terminal cleanup
Browser console clean
```

Localhost multi-tab smoke does not fully cover:

```text
real device browser differences
mobile sleep / foreground transition
Wi-Fi interruption
socket reconnect timing
different viewport and touch behavior
LAN address accessibility
mobile browser lifecycle
```

## 13. Physical LAN Smoke Interruption - Guest Mobile Input

During the physical LAN smoke, Guest reached the Join LAN Game screen but could
not reliably complete step 10.

Observed:

```text
Guest screen remained on:
Use localhost only on the Host computer. A second device must use the Host
computer's LAN address.

Host Server Address and Display Name inputs dismissed the mobile keyboard after
each typed or deleted character.
```

Root cause:

```text
Guest LAN app re-rendered the panel on every Host Server Address and Display Name
input event. On mobile browsers this replaced the active input DOM node, causing
the soft keyboard to close and preventing normal typing.
```

Fix:

```text
Guest input handlers now update local app state without re-rendering the panel
for every keystroke.
```

Regression:

```text
MultiGuestBrowserSmokeRegressionTest

Case 2:
Guest text input does not rerender controls while typing
PASS
```

Validation:

```text
MultiGuestBrowserSmokeRegressionTest PASS
node src/testRunner.js PASS
```

Physical LAN smoke status:

```text
INTERRUPTED
GUEST INPUT FIXED
SECOND JOIN BLOCKER INVESTIGATED
```

Merge gate remains:

```text
Physical LAN Smoke PASS

APPROVED FOR MERGE
APPROVED FOR CLOSURE
```

If the team chooses to merge before the physical LAN run, the correct label is:

```text
Merge candidate
Physical validation pending
```

Final current status:

```text
M16F CONTROLLED LOCALHOST SMOKE:
PASS

M16F CODE BLOCKERS:
NONE

M16F PHYSICAL MULTI-DEVICE LAN SMOKE:
READY / PENDING

REVIEW DECISION:
APPROVED FOR PHYSICAL LAN VALIDATION
```

`CLAUDE.md` remains untracked and must not be included in this branch commit.

## 14. Physical LAN Smoke Interruption - Guest Join Pending

After the mobile input fix, the Guest could type normally but the Join flow still
did not advance during physical LAN smoke.

Observed:

```text
Pressing Join Game appeared to have no visible effect.
Mark Ready, Reconnect, and Leave Room appeared dimmed and could not be used.
```

Root cause:

```text
LobbyClient started the request timeout before the Socket.IO connection was
confirmed. On a physical LAN or mobile browser, the socket connection can take
longer than the old 1 second request timeout.

This allowed a Join request to enter a pending-looking UI state without a clear
recoverable result for the player.
```

Fix:

```text
Lobby requests now wait for the socket connect event before emitting the request.
Lobby request timeout was increased from 1 second to 5 seconds.
REQUEST_TIMEOUT now maps to a clear Guest-facing LAN troubleshooting message.
```

Regression:

```text
MultiGuestBrowserSmokeRegressionTest

Case 6:
Join request waits for socket connection before emit
PASS

Case 7:
Pending Join request emits after socket connection
PASS
```

Validation:

```text
MultiGuestBrowserSmokeRegressionTest PASS
node src/testRunner.js PASS
npm run build PASS
```

Physical LAN smoke status:

```text
INTERRUPTED
JOIN PENDING FIXED
QR JOIN ADDED
READY TO RETRY FROM FRESH ROOM
```

## 15. Physical LAN Smoke Fix - QR Join

After Join input and pending-request fixes, the remaining physical Guest risk was
manual entry of Host Server Address and Room Code on mobile devices.

Observed:

```text
Guest Join required manual Host Server Address and Room Code entry.
Mobile entry had already produced two physical-smoke blockers:
- keyboard dismissal during typing
- Join flow reporting missing Host Server Address / Room Code
```

Fix:

```text
Host LAN room now renders a local SVG QR code after room creation.
QR payload opens the browser in Guest mode.
QR payload pre-fills Host Server Address and Room Code.
Manual entry remains available as fallback.
```

QR payload contract:

```text
?mode=guest
&s=<host socket server address>
&r=<room code>
```

Regression:

```text
MultiplayerLobbyUiTest

Case 5:
Host renders QR join URL with LAN server address and room code
PASS

MultiGuestBrowserSmokeRegressionTest

Case 8:
QR join URL opens Guest mode with server address and room code prefilled
PASS
```

Validation:

```text
MultiplayerLobbyUiTest PASS
MultiGuestBrowserSmokeRegressionTest PASS
node src/testRunner.js PASS
npm run build PASS
```

Physical LAN smoke status:

```text
INTERRUPTED
QR JOIN READY
READY TO RETRY FROM HOST QR CODE
```

### QR Scan Follow-up

Physical-device smoke found that the first QR image rendered on Host but was not
recognized by the mobile device camera.

Observed:

```text
QR was visible in the Host browser.
Mobile device could not scan it.
```

Fix:

```text
Hand-written QR generation was replaced with the npm qrcode package.
QR display size was increased for better mobile camera focus.
Host now also renders a clickable Open Join Link fallback.
```

Validation:

```text
MultiplayerLobbyUiTest PASS
MultiGuestBrowserSmokeRegressionTest PASS
node src/testRunner.js PASS
npm run build PASS
```

Physical LAN smoke status:

```text
INTERRUPTED
QR SCAN FIXED
QR URL HOSTNAME FIXED
READY TO RETRY WITH HOST LAN BROWSER ADDRESS
```

### QR URL Follow-up

After QR scan became readable, the mobile browser reported that it could not
connect to the server.

Observed:

```text
Mobile browser opened the scanned QR URL.
Browser reported that it could not connect to the server.
```

Root cause:

```text
When the Host browser is opened through localhost, the browser cannot infer a
mobile-reachable LAN browser address. A QR URL based on localhost is only valid
on the Host computer, not on a second device.
```

Fix:

```text
Host LAN UI now exposes Host LAN Browser Address.
If Host is opened on localhost, no unusable localhost QR join URL is rendered.
Entering http://<HOST_LAN_IP>:5173 produces a mobile-usable QR join URL.
The socket server address inside the QR uses the same LAN hostname with port 3001.
```

Regression:

```text
MultiplayerLobbyUiTest

Case 10:
Host opened on localhost does not render unusable QR join URL
PASS

Case 11:
Host LAN Browser Address creates mobile-usable QR join URL
PASS
```

Validation:

```text
MultiplayerLobbyUiTest PASS
MultiGuestBrowserSmokeRegressionTest PASS
node src/testRunner.js PASS
npm run build PASS
```

Physical LAN smoke status:

```text
INTERRUPTED
LAN QR URL FIXED
READY TO RETRY FROM FRESH ROOM
```

### QR-only Public Lobby Follow-up

Physical-device smoke found that exposing room-code and Host-address concepts to
players still produced a broken public flow.

Observed:

```text
Host room creation still left the public screen centered around Room Code.
Guest-side manual entry remained fragile on mobile devices.
Join Game could still report missing Host Server Address / Room Code.
Room Code was not useful for the intended physical LAN flow.
```

Design decision:

```text
Room Code is no longer a player-facing UI concept.
Host selects player count and immediately creates a room.
Host displays a central QR code and public player slots.
Guest scans the QR code, enters only Display Name, then joins.
Host address and room token remain hidden inside the QR payload.
```

Reference implementation shape:

```text
Public computer screen:
Choose player count
-> Show QR
-> Show joined player slots
-> Start session

Phone screen:
Scan QR
-> Enter display name
-> Join Game
-> Ready / play / leave
```

Fix:

```text
HostLobbyPanel was rebuilt as a public-screen lobby.
GuestJoinPanel was rebuilt as a phone-first join/status card.
Manual Room Code, Copy Room Code, Open Join Link, and Host Server Address UI
were removed from the public flow.
Display Name input updates no longer rerender the Guest panel, preventing mobile
keyboard dismissal while typing.
```

Regression:

```text
MultiplayerLobbyUiTest
- Host entry renders player-count room action
- Room Code copy control is not rendered
- Host renders QR join URL with LAN server address and hidden room token
- Host opened on localhost uses LAN fallback QR join URL

MultiGuestBrowserSmokeRegressionTest
- Guest text input does not rerender controls while typing
- QR join URL opens Guest mode with only display-name entry
```

Physical LAN smoke status:

```text
INTERRUPTED
QR-ONLY PUBLIC LOBBY IMPLEMENTED
READY TO RETRY FROM HOST PLAYER-COUNT SELECTION
```

## 16. Previous Owner Review Addendum

Owner review confirms the implementation matches the approved M16F Revised
Implementation Plan.

Status note:

```text
SUPERSEDED BY CONTROLLED LOCALHOST SMOKE RUN ON 2026-07-22
```

The previous review had no code blocker based on automated validation and report
inspection. A later browser smoke run found manual integration blockers; those
blockers were fixed and the controlled localhost smoke now passes.

```text
M16F IMPLEMENTATION:
APPROVED

FOCUSED TESTS:
PASS

FULL REGRESSION:
PASS

PRODUCTION BUILD:
PASS

ARCHITECTURE FREEZE:
PRESERVED

CODE BLOCKERS:
NONE

PHYSICAL MULTI-DEVICE LAN SMOKE:
PENDING
```

Previous accepted status:

```text
APPROVED FOR FINAL MULTI-DEVICE LAN SMOKE
```

The final closure gate is a real LAN scenario using:

```text
1 Dedicated Host PC
2 Guest devices or browser profiles
Optional 3 Guest room validation
```

### Manual Smoke Flow A - Two-Guest Room

```text
Host creates 2-player room
Guest A joins
Guest B joins
Both Guests mark Ready
Host starts session
```

Verify:

```text
Host has no player identity
Guest A and Guest B receive different players
Join-order assignment is stable
Host roster shows both assignments
```

### Manual Smoke Flow B - Turn And Action Synchronization

```text
Current player sends one valid action
Host dispatches once
Both Guests receive updated projection
Next current player actions are enabled
```

Verify no:

```text
duplicate dispatch
stale turn
cross-player pending state
```

### Manual Smoke Flow C - Private Projection Isolation

Verify:

```text
Guest A sees Guest A private data only
Guest B sees Guest B private data only
Guest A private data is absent from Guest B
Guest B private data is absent from Guest A
Host does not receive private projection fields
```

### Manual Smoke Flow D - Independent Reconnect

```text
Guest B disconnects temporarily
Guest A remains connected
Guest A can continue when allowed by turn state
Guest B reconnects
```

Verify:

```text
guestId preserved
playerId preserved
binding preserved
latest projection rebuilt
no history replay
no session-wide reconnect
```

### Manual Smoke Flow E - Active Leave

```text
Guest B explicitly leaves during ACTIVE session
```

Verify:

```text
Room CLOSED
Session terminated
Remaining Guest receives PLAYER_LEFT_ACTIVE_SESSION
Leaving Guest does not enter reconnect grace
No further action accepted
No VictoryResult generated
```

### Manual Smoke Flow F - Optional Three-Guest Room

```text
Host creates 3-player room
Three Guests join
All three Guests mark Ready
Host starts session
Fourth join is rejected as ROOM_FULL
```

Verify:

```text
three unique bindings
three per-viewer projections
turn gating works across all three
capacity rejection works
```

### Recommended Future Coverage

The following additional tests are recommended for future hardening if M16F needs
more coverage before or after merge review. They are not current code blockers:

```text
MultiGuestBindingTest
MultiGuestProjectionPrivacyTest
MultiGuestReconnectTest
MultiGuestLifecycleTest
MobileLanFlowIntegrationTest
```

Recommended coverage themes:

```text
Unique bindings
Projection cross-viewer privacy
Independent reconnect
Transactional start failure
Active leave terminal behavior
Lifecycle stress
End-to-end multi-Guest flow
```

## 16. Controlled LAN-address Browser Smoke - 2026-07-23

The Host and two independent Guest browser tabs were exercised through the actual
detected private address `192.168.0.182`, rather than through localhost-only URLs.

Verified:

```text
Vite browser URL responds through 192.168.0.182:5173
Socket.IO polling handshake responds through 192.168.0.182:3001
Host opened on localhost creates a QR URL using 192.168.0.182
QR URL opens Guest mode with hidden Host address and room token
Two Guests join with independent display names
Host roster reaches 2/2
Both Guests mark Ready
Host starts the session
Guests receive distinct Brandon Jaspers and Ox Bellows assignments
END_TURN from Guest A updates both projections
Guest B becomes the enabled current player
```

The first run found that `crypto.randomUUID()` is unavailable in an insecure
`http://<LAN-IP>` browser context. This blocked the Join request after the socket
connection succeeded. Browser runtime IDs now use native `randomUUID()` when present
and a Web Crypto or monotonic fallback otherwise. The controlled LAN-address flow
passed after this fix.

Physical phone/tablet scanning and device-specific firewall behavior remain the only
manual multi-device validation gate.

## 17. Physical-device UI Follow-up - 2026-07-23

A real phone reported horizontal displacement while a tablet rendered normally. Two
READY Guests were visible on Host, but the Host could not see the Start Session
control.

Root causes:

```text
LAN Status used a non-wrapping pre element that expanded the phone document to 546px
The app root was fixed to the viewport while global overflow was hidden
The Host controls were rendered after the tall QR and player-card lobby
```

Fixes:

```text
Multiplayer status/session text now wraps within the viewport
Multiplayer containers use min-width: 0 and remain within 100% width
The multiplayer shell scrolls vertically without horizontal overflow
Host controls render before the lobby and remain sticky while scrolling
```

At a simulated 390x844 viewport, document scroll width now matches the 390px viewport,
the Guest card fits between 18px and 357px, and no element overflows horizontally.
At desktop size, Start Session is visible inside the initial 720px viewport and the
Host page remains vertically scrollable.

### Guest Action Visibility Follow-up

Physical testing then confirmed correct assignments and turn state:

```text
Guest A assigned Brandon Jaspers
Guest B assigned Ox Bellows
Both projections show Brandon Jaspers as the initial current player
```

The action controls were generated correctly but appeared below the full-height Guest
card and diagnostic LAN Status panel. The Guest layout now renders the Session/action
panel directly after the player card, before diagnostic status, and no longer forces
the player card to occupy the full viewport. At mobile widths, action buttons use
full-width 48px touch targets. Brandon receives enabled COLLECT and END_TURN controls;
Ox sees the same controls disabled until the turn changes.

## 18. Final Owner Acceptance - 2026-07-23

This section supersedes earlier pending physical-smoke notes in this development
history.

Final accepted LAN flow:

```text
Host creates a fixed 2- or 3-player room
Guests scan the LAN QR and enter a display name
Each Guest immediately receives a stable character assignment
No Mark Ready step is required
Host start enables when the exact roster is connected
Session start removes the QR lobby and mounts the public House Map stage
Host monitors PLAYING / RECONNECTING / OFFLINE per player
Page refresh resumes the same guestId, character, binding, and action sequence
Guest actions remain valid after resume
```

Final verification:

```text
Full regression: PASS
Production build: PASS (227 modules)
Controlled two-Guest LAN browser flow: PASS
Physical phone/tablet owner validation: ACCEPTED
M16F: COMPLETE
```
