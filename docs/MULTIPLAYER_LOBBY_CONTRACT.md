# Multiplayer Lobby Contract

Version: 1.0
Milestone: M16C - Local Multiplayer Lobby & Socket Transport

---

## Purpose

M16C adds a local socket lobby for one host and one guest. The lobby is connection
infrastructure only. It is not gameplay state and does not own or inspect runtime,
scenario, action legality, victory, projection, save/load, or router internals.

Identity terms are distinct:

```text
roomId    -> server internal lobby identity
roomCode  -> human-facing join code
sessionId -> gameplay transport identity
```

`roomId`, `roomCode`, and `sessionId` must not be reused as the same value.

---

## Protocol Split

Lobby protocol:

- `CLIENT_ASSIGNED`
- `CREATE_ROOM`
- `ROOM_CREATED`
- `JOIN_ROOM`
- `LEAVE_ROOM`
- `CLOSE_ROOM`
- `ROOM_JOINED`
- `ROOM_REJECTED`
- `PEER_CONNECTED`
- `PEER_DISCONNECTED`
- `RESUME_ROOM`
- `ROOM_RESUMED`
- `RESUME_REJECTED`

Session control protocol:

- `ACTIVATE_SESSION`
- `SESSION_STARTED`
- `PLAYER_BINDING_ASSIGNED`
- `SESSION_CLOSED`
- `PEER_RECONNECTING`
- `PEER_RESUMED`
- `RESUME_SESSION`
- `SESSION_RESUMED`
- `RESUME_FAILED`

Gameplay transport protocol:

- `PLAYER_ACTION`
- `ACTION_RESULT`
- `STATE_UPDATED`
- `TRANSPORT_ERROR`

Lobby and session control messages use:

```js
{
    type,
    requestId,
    payload
}
```

They must not contain PlayerAction, scenario state, runtime snapshot, projection, or
InformationRouter data.

---

## Room Model

M16C supports exactly one host and one guest:

```js
{
    roomId,
    roomCode,
    hostClientId,
    guestClientId,
    sessionId,
    status
}
```

Allowed states:

- `WAITING`
- `READY`
- `ACTIVE`
- `RECONNECTING`
- `CLOSED`

Allowed transitions:

```text
WAITING -> READY
READY   -> WAITING
READY   -> ACTIVE
ACTIVE  -> RECONNECTING
RECONNECTING -> ACTIVE
RECONNECTING -> CLOSED
WAITING -> CLOSED
READY   -> CLOSED
ACTIVE  -> CLOSED
```

Forbidden transitions:

```text
ACTIVE -> READY
RECONNECTING -> READY
RECONNECTING -> WAITING
CLOSED -> anything
```

Each socket client may belong to zero or one room. A second create/join request while
already in a room must return `ALREADY_IN_ROOM`.

---

## Session Activation

Activation order:

```text
Host creates LocalGameSession
Host creates PlayerBindings
Host sends ACTIVATE_SESSION
Server validates HOST + READY room
Server confirms sessionId
Room becomes ACTIVE
Server sends SESSION_STARTED
Host sends PLAYER_BINDING_ASSIGNED
Guest validates binding
GuestGameSession is created
Host sends initial STATE_UPDATED revision 1
```

The server only activates the transport lifecycle. It does not create gameplay runtime
or choose domain players.

---

## Binding Rule

Host is the player binding authority.

Guest must reject binding when:

- `binding.clientId !== ownClientId`
- `binding.role !== "GUEST"`
- `binding.playerId !== binding.viewerId`
- `binding.sessionId !== expectedSessionId`

Invalid binding must not create `GuestGameSession`, activate gameplay transport, or
allow actions.

---

## Disconnect Policy

Guest disconnect while `READY`:

```text
READY -> WAITING
guest slot cleared
host receives PEER_DISCONNECTED
room remains open
```

Guest disconnect while `ACTIVE`:

```text
ACTIVE -> RECONNECTING
host receives PEER_RECONNECTING
no gameplay mutation
guest membership reserved for reconnect grace
```

If reconnect grace expires:

```text
RECONNECTING -> CLOSED
host receives SESSION_CLOSED
resume token invalidated
```

Host disconnect:

```text
Room -> CLOSED
guest receives SESSION_CLOSED
guest destroys local guest session
no host migration
```

`SESSION_CLOSED` is a lifecycle message. It must not be represented as
`TRANSPORT_ERROR`.

---

## M16E Leave And Close Addendum

M16E adds explicit user-driven room lifecycle controls:

- `LEAVE_ROOM`
- `CLOSE_ROOM`

These messages are not a generic presence, kick, ban, or disconnect-reason framework.
They exist only to distinguish intentional browser UI actions from unexpected socket
disconnect.

Guest `LEAVE_ROOM`:

```text
Intentional Guest leave
-> no reconnect grace
-> host receives PEER_DISCONNECTED or SESSION_CLOSED depending on room state
```

Host `CLOSE_ROOM`:

```text
Host sends close request
-> server closes room
-> guest receives SESSION_CLOSED
-> host receives SESSION_CLOSED acknowledgement
-> browser app may clean up locally
```

Close requests must be sent before local socket destruction.
