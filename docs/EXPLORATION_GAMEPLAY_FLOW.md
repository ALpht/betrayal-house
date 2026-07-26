# M17C Exploration Gameplay Flow

## Scope

M17C implements the third-edition core directional exploration loop, with
region-backed Tile selection, open-region preservation, house adjustment, and
Speed-based movement deferred.

It does not claim to implement the complete third-edition exploration rules.

## Canonical Action Flow

```text
Local or Guest MOVE PlayerAction
        |
        v
AuthoritativeGameplayActionRouter
        |
        +-- EXPLORATION --> ExplorationActionHandler
        |
        +-- HAUNT -------> existing ScenarioActionHandler
```

`GameStateManager` selects the phase. Exploration requires no ScenarioRuntime; Haunt
requires one. An inconsistent lifecycle rejects without fallback or publication.

## Direction Availability

Each cardinal direction has an authoritative internal result:

```js
{
    direction,
    topology: "CONNECTED" | "UNKNOWN" | "WALL" | "BLOCKED",
    enabled,
    reasonCode
}
```

- `CONNECTED`: the adjacent room exists, both doors match, and both RoomNodes contain
  the reciprocal Graph edge.
- `UNKNOWN`: the source has a door and the adjacent coordinate is empty.
- `WALL`: the source has no door in that direction.
- `BLOCKED`: the source has a door, but the coordinate is occupied without a valid
  reciprocal connection.
- no placeable Tile keeps topology `UNKNOWN` and disables it with
  `NO_PLACEABLE_TILE`.

Availability is a pure query. It does not mutate the deck, graph, player, turn,
events, random state, or multiplayer revision.

## Unknown-Room Planning And Commit

```text
Pure plan
  inspect ordered Tile snapshots
  try four rotations
  select first legal Tile and rotation
        |
        v
Revalidate phase, player, room, coordinate, deck version and Tile identity
        |
        v
Commit planned Tile draw, RoomNode, reciprocal edges and player movement
        |
        v
Run existing reveal, card, Haunt and turn pipeline
```

All ordinary rule rejection happens before the TileDeck commit. When the full deck
cannot be placed, exact deck order, GraphMap, player, turn, events, and projection
revision remain unchanged.

## Turn Rules

Connected-room MOVE does not end the turn. The current player may continue moving or
end voluntarily because Speed points are deferred.

Discovering a room ends the exploration turn after its existing trigger pipeline.
An action-scoped tracker observes existing Haunt and turn events. If the Haunt
lifecycle already changed the turn synchronously, Exploration does not advance it
again.

## Fixed Boundaries

M17C adds no Domain Event, Transport Message, ActionType, Save schema, client GraphMap,
pathfinding, topology reconstruction, movement UI framework, or exploration
ScenarioRuntime.
