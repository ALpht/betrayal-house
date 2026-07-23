# Multi-Guest Session Contract

Milestone: M16F - Dedicated Host & Multi-Guest LAN Foundation

## Room Model

Stored room lifecycle:

```text
WAITING_FOR_PLAYERS
ACTIVE
CLOSED
```

Start readiness is derived, not stored:

```text
room.lifecycle === WAITING_FOR_PLAYERS
AND active roster count === playerCount
AND every active member is CONNECTED
AND every active member is READY
AND identities are valid and unique
```

## Roster Member

Internal roster members track separate dimensions:

```text
guestId
currentConnectionId
displayName
membershipState: ACTIVE | LEFT
connectionState: CONNECTED | RECONNECTING | DISCONNECTED
readiness: READY | NOT_READY
joinOrder
playerId
```

`ROOM_ROSTER_UPDATED` is a public DTO. It must not include resume tokens, socket
metadata, raw bindings, runtime, router, snapshot, projection, or private player data.

## Start Transaction

Session start is transactional:

```text
Freeze ordered roster
Create exactly N Players
Assign by stable joinOrder
Create complete guestId -> playerId bindings
Validate uniqueness
Create authoritative session
Set room ACTIVE
Publish one binding per Guest
Publish one projection per Guest
```

Failure leaves the room waiting and publishes no partial binding or projection.

## Identity

`guestId` is stable logical Guest identity. `currentConnectionId` is replaceable socket
connection identity.

Bindings are owned by:

```text
guestId -> playerId
```

Resume replaces `currentConnectionId` and preserves `guestId` and `playerId`.

## Projection Fanout

After accepted gameplay action:

```text
CONNECTED     -> build and send latest viewer projection
RECONNECTING  -> no send and no queue
LEFT          -> no build and no send
```

Resume sends the latest rebuilt projection only. M16F does not add projection replay,
history queues, reliable delivery, or action replay.

## Active Leave

Active Guest explicit leave is terminal:

```text
member LEFT
room CLOSED
reason PLAYER_LEFT_ACTIVE_SESSION
no reconnect grace
no further PlayerAction
```

This reason is a multiplayer session termination reason, not a gameplay VictoryResult.
