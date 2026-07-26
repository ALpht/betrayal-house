# Dedicated Host Contract

Milestone: M16F - Dedicated Host & Multi-Guest LAN Foundation

## Contract

The LAN Host is session and lobby authority only. The Host is not a player.

Host must not own:

```text
playerId
viewerId
assignedPlayer
MultiplayerPlayerBinding
PlayerAction controls
private player projection
```

Host may own:

```text
roomId
roomCode
playerCount
public roster
authoritative local game session
binding registry
per-viewer projection publisher
room close / start controls
```

Host UI may display public roster assignment rows:

```text
displayName
connectionState
readiness
publicPlayerName
publicCharacterName
```

Host UI must not display private objectives, inventories, viewer-only disabled reasons,
or pending player action state.

## Player Count

Rooms use fixed player count:

```text
playerCount = required player count = capacity
allowed: 2 or 3
default: 2
```

There is no bench, spectator slot, or late player insertion in M16F.

## M17A Public House Map Addendum

The Host may consume a public-only projection:

```js
{
    map: {
        rooms,
        players,
        currentPlayerId
    }
}
```

This does not make the Host a Viewer. The Host projection must not include
`viewerId`, player assignment, private character presentation, gameplay actions, or
viewer-specific information packets.

The Host renders the current projection immediately after activation and subscribes to
one local notification per authoritative publish cycle. Unsubscribe is owned by Host
bootstrap cleanup, and Host session destroy clears any remaining subscribers.
