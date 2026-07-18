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
- `ROOM_JOINED`
- `ROOM_REJECTED`
- `PEER_CONNECTED`
- `PEER_DISCONNECTED`

Session control protocol:

- `ACTIVATE_SESSION`
- `SESSION_STARTED`
- `PLAYER_BINDING_ASSIGNED`
- `SESSION_CLOSED`

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
- `CLOSED`

Allowed transitions:

```text
WAITING -> READY
READY   -> WAITING
READY   -> ACTIVE
WAITING -> CLOSED
READY   -> CLOSED
ACTIVE  -> CLOSED
```

Forbidden transitions:

```text
ACTIVE -> READY
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
ACTIVE -> CLOSED
host receives SESSION_CLOSED
no gameplay mutation
no reconnect
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
