# Multiplayer Transport Contract

Version: 1.0
Milestone: M16A - Local Multiplayer Transport Foundation

---

## Authority Model

Host is the only gameplay authority.

Guest is render-only:

- no Gameplay Runtime
- no Gameplay Controller
- no ActionValidator copy
- no ScenarioActionHandler copy
- no scenario state mutation

Allowed flow:

```text
Guest
  -> PLAYER_ACTION
  -> Transport
  -> HostTransportGateway
  -> Existing PlayerAction domain contract
  -> Existing gameplay pipeline
  -> Viewer-safe STATE_UPDATED
  -> Guest projection
```

---

## Envelope Contract

All transport messages share only the minimum common envelope:

```js
{
    type,
    sessionId,
    payload
}
```

Message-specific fields:

| Message | Additional required fields |
| --- | --- |
| PLAYER_ACTION | senderId, sequence |
| STATE_UPDATED | revision |
| CONNECTION_READY | none; payload may include playerId, revision, projection |
| ACTION_RESULT | none; payload must include sequence, accepted, reasonCode |
| TRANSPORT_ERROR | none |

Do not make `senderId`, `sequence`, or `revision` common required fields.

---

## Message Types

### PLAYER_ACTION

Guest to Host.

```js
{
    type: "PLAYER_ACTION",
    sessionId: "local-session",
    senderId: "player-2",
    sequence: 1,
    payload: {
        id: "action-id",
        type: "COLLECT",
        playerId: "player-2",
        payload: {}
    }
}
```

Payload is a plain serializable command. Host reconstructs the existing `PlayerAction`
domain object before passing it to the existing gameplay pipeline.

### STATE_UPDATED

Host to Guest.

```js
{
    type: "STATE_UPDATED",
    sessionId: "local-session",
    revision: 1,
    payload: {
        projection: {}
    }
}
```

Payload contains viewer-safe UI projection only.

### CONNECTION_READY

Optional in M16A. If used, payload should be:

```js
{
    playerId,
    revision,
    projection
}
```

M16A may instead send the first usable state as `STATE_UPDATED` revision 1.

### ACTION_RESULT

Host to sending client.

```js
{
    type: "ACTION_RESULT",
    sessionId: "local-session",
    payload: {
        sequence: 4,
        accepted: true,
        reasonCode: null
    }
}
```

`ACTION_RESULT` is multiplayer delivery feedback, not a gameplay event.

Contract:

```text
accepted === true  -> reasonCode === null
accepted === false -> reasonCode is non-empty
```

Allowed M16B reason codes:

- IDENTITY_MISMATCH
- DUPLICATE_SEQUENCE
- ACTION_REJECTED
- GAME_ENDED
- SESSION_DESTROYED

### TRANSPORT_ERROR

Transport boundary errors only:

- malformed JSON
- unsupported message type
- missing `sessionId`
- invalid transport envelope shape
- destroyed transport
- session not found

Gameplay rejection is not `TRANSPORT_ERROR`.

Unknown sender, identity mismatch, duplicate sequence, gameplay rejection, game ended,
and accepted action are `ACTION_RESULT`, not `TRANSPORT_ERROR`.

---

## Identity Check Order

For `PLAYER_ACTION`, HostTransportGateway must check:

```text
Envelope shape
Session match
Message type
PlayerAction reconstruction
senderId === playerAction.playerId
sequence > lastAcceptedSequence(senderId)
Existing gameplay pipeline
```

`senderId / playerId` mismatch is rejected before gameplay dispatch.

---

## Sequence Consumption Rule

Guest sequence starts at 1.

Host tracks `lastAcceptedSequence` per sender.

Transport failures do not consume sequence:

- malformed envelope
- session mismatch
- sender mismatch
- duplicate or stale sequence

After a message passes transport contract checks and is delivered to the gameplay
pipeline, its sequence is accepted even if gameplay later rejects the action.

This prevents repeated invalid retries from repeatedly entering gameplay validation.

---

## Revision Increment Rule

Host revision starts at 0.

Revision increments only when an authoritative state is actually published:

```text
publishState()
  -> revision += 1
  -> build STATE_UPDATED envelope
  -> send
```

Do not increment revision for:

- guest connect by itself
- invalid action by itself
- transport error by itself

Guest applies only `revision > currentRevision`.

---

## Projection Null-state Contract

Projection shape is stable. These fields may be `null` or empty before all local
systems are ready:

- `scenario`
- `victory`
- `character`
- `turn`

Default victory shape:

```js
{
    completed: false,
    winner: null,
    reason: null
}
```

Projection contains UI data only:

```js
{
    viewerId,
    currentPlayerId,
    lifecycleState,
    gameEnded,
    turn,
    character,
    scenario,
    victory,
    cards,
    actions
}
```

Projection must not include:

- raw runtime snapshot
- router internals
- raw scenario state
- private packets for other audiences
- domain objects

Visibility filtering happens on Host before transport.

---

## Transport Boundary

InMemoryTransport must deliver through:

```text
serialize
  -> deserialize
  -> deliver
```

Direct listener object delivery is forbidden because it does not prove the network
serialization boundary.

Transport messages are not gameplay EventBus events. See `EVENT_CATALOG.md` for
gameplay events only.

---

## M16C Socket Transport Addendum

M16C adds a real localhost socket adapter without changing the transport envelope.

The socket event payload is:

```js
{
    senderId,
    serializedEnvelope
}
```

`senderId` is server-owned relay metadata derived from the socket connection.
`serializedEnvelope` is the existing transport envelope serialized through
`TransportSerializer`.

The server does not rewrite gameplay payload. Host must use the trusted relay metadata
as sender source and then apply the existing binding, ownership, sequence, and
victory-lock checks.

Server may inspect routing metadata only:

- message type
- sessionId
- room membership
- connection identity
- role
- allowed direction

Server must not inspect gameplay payload meaning, ActionType semantics, turn legality,
scenario state, projection content, or victory meaning.

Socket ownership lives in `docs/SOCKET_TRANSPORT_CONTRACT.md`.

M16D reconnect does not add new gameplay transport messages. Resume uses lobby/session
control messages and then continues with the existing `PLAYER_ACTION`, `ACTION_RESULT`,
`STATE_UPDATED`, and `TRANSPORT_ERROR` contract.
