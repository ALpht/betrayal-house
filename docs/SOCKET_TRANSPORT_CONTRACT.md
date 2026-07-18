# Socket Transport Contract

Version: 1.0
Milestone: M16C - Local Multiplayer Lobby & Socket Transport

---

## Purpose

M16C replaces the deterministic in-memory transport boundary with a localhost socket
adapter while preserving the M16A/M16B contract:

```text
Host Execute
Guest Render
PlayerAction Up
Viewer-safe Projection Down
```

The socket server is not gameplay authority. It routes messages and enforces connection
metadata only.

---

## Socket Ownership

Bootstrap owns the socket.io client instance.

```text
Bootstrap owns socket connection
LobbyClient owns lobby listeners
SocketTransportEndpoint owns transport listeners
Server owns Socket.io + HTTP server
```

Rules:

- `LobbyClient.destroy()` removes only lobby listeners.
- `SocketTransportEndpoint.destroy()` removes only transport listeners.
- Neither child calls `socket.disconnect()` for a shared socket.
- Bootstrap destroys children first, then disconnects the socket and removes remaining
  bootstrap-owned listeners.
- Test sockets use `reconnection: false`, `forceNew: true`, `multiplex: false`, and
  `transports: ["websocket"]`.

---

## Transport Event Shape

Socket event names are infrastructure-only:

- `lobby:request`
- `lobby:response`
- `transport:message`
- `connection:error`

Gameplay message names are never socket event names.

Transport payload:

```js
{
    senderId,
    serializedEnvelope
}
```

`serializedEnvelope` is the existing transport envelope serialized through
`TransportSerializer`.

Required boundary:

```text
TransportSerializer.serialize()
-> string
-> socket emit
-> socket receive
-> TransportSerializer.deserialize()
-> plain object delivery
```

---

## Trusted Sender

Client-provided sender identity is not trusted.

The server does not rewrite gameplay payload. Instead, it relays trusted connection
metadata:

```js
{
    senderId: connection.clientId,
    serializedEnvelope
}
```

Host transport uses relay metadata as the trusted sender source before existing
binding, ownership, sequence, and victory-lock checks.

---

## Server Relay Boundary

Server may inspect:

- message type
- sessionId
- room membership
- connection identity
- role
- allowed direction

Server must not inspect:

- ActionType meaning
- action legality
- turn legality
- scenario state
- projection content
- victory meaning

Allowed directions:

| Message | From | To |
| --- | --- | --- |
| `PLAYER_ACTION` | Guest | Host |
| `ACTION_RESULT` | Host | Guest |
| `STATE_UPDATED` | Host | Guest |
| `TRANSPORT_ERROR` | Host / Server | Relevant client |

Guest `STATE_UPDATED`, guest `ACTION_RESULT`, guest `ACTIVATE_SESSION`, and guest
`PLAYER_BINDING_ASSIGNED` must be rejected before relay.

---

## Revision And Publish Failure

Initial guest projection after session activation is revision 1.

Only accepted gameplay publishes increment revision. Lobby messages, binding assignment,
session lifecycle messages, rejected actions, duplicate actions, and disconnect notices
do not increment revision.

If host gameplay accepts a local action but guest publish fails:

```text
gameplay mutation is retained
turn/victory mutation is retained
publish failure is recorded
no rollback
no retry loop
no duplicate gameplay execution
```

Network delivery failure must not change gameplay result.

---

## M16D Reconnect Addendum

Reconnect orchestration remains outside `SocketTransportEndpoint`.

```text
Guest Bootstrap = socket replacement and resume lifecycle
LobbyClient = lobby/session listeners
SocketTransportEndpoint = single-connection gameplay transport listener
```

During resume, the server continues to relay trusted `clientId` metadata resolved from
server state. Guest-supplied identity is never trusted.

Old socket mappings are revoked during atomic resume claim. Late messages from old
sockets must be rejected before gameplay dispatch.
