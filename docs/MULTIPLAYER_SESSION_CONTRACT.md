# Multiplayer Session Contract

Version: 1.0
Milestone: M16B - Action / Turn Synchronization

---

## Purpose

M16B defines the session-level multiplayer integration contract that sits between the
M16A transport boundary and the existing gameplay pipeline.

The core boundary remains:

```text
Host Execute
Guest Render
PlayerAction Up
Viewer-safe Projection Down
```

M16B does not add socket transport, lobby, reconnect, authentication, multi-guest
routing, full guest browser UI, turn framework, gameplay error taxonomy, or scenario
runtime changes.

---

## Player Binding

Each multiplayer client has exactly one fixed binding:

```js
{
    sessionId,
    clientId,
    playerId,
    viewerId,
    role
}
```

Terms:

- `clientId`: sender identity.
- `playerId`: gameplay identity.
- `viewerId`: visibility identity.
- `role`: `HOST` or `GUEST`.

M16B rule:

```text
playerId === viewerId
```

The binding is an immutable integration value object. It must not include turn state,
permissions, character data, connection lifecycle, or action availability.

---

## Action Ownership

Guest actions are accepted for authoritative handling only after:

```text
Envelope valid
Session matches
PLAYER_ACTION shape valid
Binding exists
senderId === binding.clientId
action.playerId === binding.playerId
sequence is newer
```

Identity and ownership checks happen before sequence is consumed and before gameplay is
called.

Unknown sender maps to:

```js
{
    sequence,
    accepted: false,
    reasonCode: "IDENTITY_MISMATCH"
}
```

Unknown sender must not create a binding, sequence state, gameplay dispatch, or state
revision.

---

## Action Result

`ACTION_RESULT` is multiplayer delivery feedback. It is not a gameplay event and not a
scenario rule contract.

Shape:

```js
{
    type: "ACTION_RESULT",
    sessionId,
    payload: {
        sequence,
        accepted,
        reasonCode
    }
}
```

Consistency:

```text
accepted === true  -> reasonCode === null
accepted === false -> reasonCode is non-empty
```

Allowed reason codes:

- `IDENTITY_MISMATCH`
- `DUPLICATE_SEQUENCE`
- `ACTION_REJECTED`
- `GAME_ENDED`
- `SESSION_DESTROYED`

---

## Sequence Consumption

Sequence state is keyed by `clientId`.

Consumption rules:

| Failure / result | Consume sequence |
| --- | ---: |
| Malformed envelope | No |
| Session mismatch | No |
| Unknown sender | No |
| Identity mismatch | No |
| Duplicate/old sequence | Already consumed / no change |
| Game ended | Yes |
| Gameplay rejection | Yes |
| Gameplay acceptance | Yes |

Gameplay rejection and `GAME_ENDED` consume sequence because they are valid client
intents that reached the authoritative boundary.

---

## Authoritative Execution

Host local and guest remote actions share one authoritative gameplay adapter:

```js
executeAuthoritativeAction(action)
```

The adapter wraps the existing local gameplay pipeline and normalizes the result:

```js
{ accepted: true, reasonCode: null }
{ accepted: false, reasonCode: "ACTION_REJECTED" }
```

The adapter must not inspect snapshots, scenario state keys, current-player changes, or
runtime internals to infer acceptance.

---

## Pending Action

Guest has at most one pending action.

Guest send flow:

```text
Create provisional pending sequence
transport.send()
send success -> sequence increments
send failure -> pending clears, sequence unchanged, synthetic SESSION_DESTROYED result
```

Only matching `ACTION_RESULT.sequence` clears pending action. Mismatched results may
update `lastActionResult`, but must not clear a newer pending action.

Destroy clears pending and ignores late `ACTION_RESULT` / `STATE_UPDATED` messages.

---

## Projection

Turn projection:

```js
turn: {
    playerId,
    displayName,
    isViewerTurn
}
```

Null-state:

```js
turn: {
    playerId: null,
    displayName: null,
    isViewerTurn: false
}
```

Viewer action gating:

```js
enabled =
    Boolean(action.enabled) &&
    currentPlayerId === viewerId &&
    !gameEnded
```

Action projection whitelist:

```js
{
    type,
    label,
    enabled
}
```

Do not spread raw action models into multiplayer projection. Non-current viewers must
not receive private target, option, payload, or action metadata.

---

## Publishing

Accepted action order:

```text
ACTION_RESULT
STATE_UPDATED
```

Rejected gameplay action:

```text
ACTION_RESULT rejected
No revision increment
No STATE_UPDATED
```

Publishing boundary:

```text
Host UI    -> existing M15 PresentationController
Guest UI   -> viewer-safe projection transport
```

M16B entry points:

```js
publishGuestState(guestViewerId)
buildProjection(hostViewerId)
```

Host projection is for tests, debug, and contract comparison; it is not sent back to the
host through transport.
