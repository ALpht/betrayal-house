# Multiplayer Reconnect Contract

Version: 1.0
Milestone: M16D - Reconnect & Session Resume

---

## Purpose

M16D recovers a temporarily disconnected Guest without recovering gameplay runtime,
missed actions, delivery history, server restart state, host authority, or reliable
delivery queues.

Recoverable path:

```text
Guest socket lost
-> Room enters RECONNECTING
-> Guest reconnects with resumeToken
-> Server restores stable clientId and room membership
-> Host confirms authoritative session
-> Host reissues Player Binding
-> Host publishes latest viewer-safe projection
-> Guest continues with new actions
```

Authority remains:

```text
Server = identity / room / reservation authority
Host   = gameplay / binding / projection authority
Guest  = resume requester / projection consumer
```

---

## Identity

M16D separates infrastructure connection identity from stable participant identity:

```text
socket.id = current connection
clientId  = stable server-owned participant
```

Server indexes:

```text
socket.id -> clientId
clientId -> roomId
resumeToken -> reservation
```

On successful resume:

```text
old socket.id mapping removed
new socket.id -> same clientId
```

Old socket late messages must not reach gameplay dispatch.

---

## Reservation

Resume reservation state:

```js
{
    clientId,
    roomId,
    role,
    sessionId,
    expiresAt,
    generation
}
```

Reservation must not store:

- playerId
- viewerId
- scenario state
- projection
- revision
- runtime snapshot

`expiresAt` is the source of truth for token validity. Timer callbacks are cleanup
triggers only and must validate current generation before closing a room.

---

## Atomic Claim

Resume claim must be one synchronous boundary:

```text
token validation
expiration validation
timer cancellation
old socket revocation
new socket assignment
token rotation
room transition
```

No partial success state is allowed. Resume-vs-expiry race produces exactly one outcome:

```text
ROOM_RESUMED
or
SESSION_CLOSED
```

---

## Protocol

Lobby additions:

- `RESUME_ROOM`
- `ROOM_RESUMED`
- `RESUME_REJECTED`

Session control additions:

- `PEER_RECONNECTING`
- `PEER_RESUMED`
- `RESUME_SESSION`
- `SESSION_RESUMED`
- `RESUME_FAILED`

`RESUME_SESSION` guest payload contains only:

```js
{ sessionId }
```

Server attaches trusted recovered sender metadata. Host must not trust guest-supplied
clientId.

`RESUME_REJECTED` means server rejected room or identity recovery.
`RESUME_FAILED` means host rejected authoritative session recovery.

---

## Guest Ready Gate

Guest lifecycle:

```text
RECONNECTING
-> ROOM_RESUMED
-> RESUMING
-> SESSION_RESUMED
-> Binding Valid
-> Recovery Baseline Accepted
-> ACTIVE
```

Guest is not active until binding validation and recovery baseline both succeed.

---

## Revision Recovery

Only the first `STATE_UPDATED` after valid session resume and binding validation may
use the recovery baseline exception.

Allowed:

```text
recoveryRevision === previousLastRevision
recoveryRevision > previousLastRevision
```

Rejected:

```text
recoveryRevision < previousLastRevision
```

After one recovery baseline is accepted, normal monotonic checks resume:

```text
incoming revision > current revision
```

---

## Pending Action And Sequence

On socket disconnect:

```text
pendingAction = null
nextSequence unchanged
```

Synthetic local result:

```js
{
    sequence,
    accepted: false,
    reasonCode: "CONNECTION_LOST",
    source: "LOCAL_TRANSPORT"
}
```

This result is local-only. It is not an authoritative host `ACTION_RESULT` envelope.

No automatic action replay is allowed. Uncertain sequence is never reused.

---

## Host During Reconnect

Host local gameplay may continue while Guest is reconnecting.

No queues:

- no projection queue
- no action queue
- no replay queue
- no rollback

On resume, Host builds the latest full viewer-safe projection from current authoritative
state.

Host disconnect is terminal: room closes, reservation invalidates, token invalidates,
and Guest ends closed if reachable.

## M16F Per-Guest Reconnect Addendum

Reconnect is member-level, not room-level:

```text
Guest B RECONNECTING
Guest A/C remain CONNECTED
Room remains ACTIVE
```

Resume restores the stable guestId and existing player binding while replacing the
current connection identity. Reconnecting Guests receive no projection history; the Host
rebuilds and sends the latest viewer-safe projection after resume.
