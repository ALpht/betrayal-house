export const ExplorationDirection = Object.freeze({
    NORTH: "north",
    EAST: "east",
    SOUTH: "south",
    WEST: "west"
});

export const EXPLORATION_DIRECTIONS = Object.freeze([
    ExplorationDirection.NORTH,
    ExplorationDirection.WEST,
    ExplorationDirection.EAST,
    ExplorationDirection.SOUTH
]);

export const EXPLORATION_DIRECTION_DATA = Object.freeze({
    north: Object.freeze({ dx: 0, dy: -1, opposite: "south", label: "↑ North" }),
    east: Object.freeze({ dx: 1, dy: 0, opposite: "west", label: "→ East" }),
    south: Object.freeze({ dx: 0, dy: 1, opposite: "north", label: "↓ South" }),
    west: Object.freeze({ dx: -1, dy: 0, opposite: "east", label: "← West" })
});

export function getExplorationDirectionData(direction) {
    return EXPLORATION_DIRECTION_DATA[direction] || null;
}
