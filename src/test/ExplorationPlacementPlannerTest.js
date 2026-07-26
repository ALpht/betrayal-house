import { GraphMap } from "../model/GraphMap.js";
import { RoomNode } from "../model/RoomNode.js";
import { RoomTile } from "../model/RoomTile.js";
import { TileDeck } from "../model/TileDeck.js";
import { ExplorationPlacementPlanner } from "../gameplay/exploration/ExplorationPlacementPlanner.js";

function tile(id, exits) {
    return new RoomTile(id, `Tile ${id}`, exits);
}

function ids(deck) {
    return deck.getRemainingTiles().map(candidate => candidate.id);
}

export function runExplorationPlacementPlannerTest() {
    console.log("\n===== Exploration Placement Planner Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        let randomCalls = 0;
        const deck = new TileDeck([
            tile("closed-a", {
                north: false, east: false, south: false, west: false
            }),
            tile("closed-b", {
                north: false, east: false, south: false, west: false
            })
        ], {
            random: () => {
                randomCalls++;
                return 0.999999;
            }
        });
        const graph = new GraphMap();
        const source = new RoomNode("source", tile("source-tile", {
            north: false, east: true, south: false, west: false
        }), 0, 0);
        graph.addRoom(source);
        const planner = new ExplorationPlacementPlanner();
        const orderBefore = ids(deck);
        const callsBefore = randomCalls;
        const versionBefore = deck.getVersion();
        const first = planner.planExploration({
            sourceRoom: source,
            direction: "east",
            targetCoordinate: { x: 1, y: 0 },
            tileCandidates: deck.getRemainingTiles(),
            graphMapView: graph,
            deckVersion: versionBefore
        });
        const second = planner.planExploration({
            sourceRoom: source,
            direction: "east",
            targetCoordinate: { x: 1, y: 0 },
            tileCandidates: deck.getRemainingTiles(),
            graphMapView: graph,
            deckVersion: versionBefore
        });

        assert(
            !first.accepted &&
                first.reasonCode === "NO_PLACEABLE_TILE" &&
                JSON.stringify(first) === JSON.stringify(second) &&
                JSON.stringify(ids(deck)) === JSON.stringify(orderBefore) &&
                deck.getVersion() === versionBefore &&
                randomCalls === callsBefore &&
                graph.getAllRooms().length === 1,
            "Case 1: Failed full-deck planning is pure and preserves exact order"
        );
    } catch (error) {
        failed++;
        console.log("[FAIL] Case 1 threw", error.message);
    }

    try {
        const deck = new TileDeck([
            tile("skip", {
                north: false, east: false, south: false, west: false
            }),
            tile("select", {
                north: true, east: false, south: false, west: false
            }),
            tile("remain", {
                north: true, east: true, south: false, west: false
            })
        ], { random: () => 0.999999 });
        const graph = new GraphMap();
        const source = new RoomNode("source", tile("source-tile", {
            north: false, east: true, south: false, west: false
        }), 0, 0);
        graph.addRoom(source);
        const planner = new ExplorationPlacementPlanner();
        const plan = planner.planExploration({
            sourceRoom: source,
            direction: "east",
            targetCoordinate: { x: 1, y: 0 },
            tileCandidates: deck.getRemainingTiles(),
            graphMapView: graph,
            deckVersion: deck.getVersion()
        });
        const commit = deck.commitPlannedDraw({
            selectedTileId: plan.selectedTileId,
            selectedTileIndex: plan.selectedTileIndex,
            expectedVersion: plan.deckVersion
        });

        assert(
            plan.accepted &&
                plan.selectedTileId === "select" &&
                plan.selectedTileIndex === 1 &&
                plan.rotation === 3 &&
                commit.accepted &&
                commit.tile.id === "select" &&
                JSON.stringify(ids(deck)) === JSON.stringify(["remain", "skip"]),
            "Case 2: Planner selects first legal rotation and commit preserves deck policy"
        );
    } catch (error) {
        failed++;
        console.log("[FAIL] Case 2 threw", error.message);
    }

    try {
        const deck = new TileDeck([
            tile("a", { north: true, east: false, south: false, west: false }),
            tile("b", { north: true, east: false, south: false, west: false })
        ], { random: () => 0.999999 });
        const before = ids(deck);
        const stale = deck.commitPlannedDraw({
            selectedTileId: "a",
            selectedTileIndex: 0,
            expectedVersion: deck.getVersion() + 1
        });
        const mismatch = deck.commitPlannedDraw({
            selectedTileId: "b",
            selectedTileIndex: 0,
            expectedVersion: deck.getVersion()
        });
        const snapshots = deck.getRemainingTiles();

        assert(
            !stale.accepted &&
                !mismatch.accepted &&
                JSON.stringify(ids(deck)) === JSON.stringify(before) &&
                Object.isFrozen(snapshots) &&
                Object.isFrozen(snapshots[0]) &&
                Object.isFrozen(snapshots[0].exits),
            "Case 3: Stale plans reject before mutation and deck snapshots are immutable"
        );
    } catch (error) {
        failed++;
        console.log("[FAIL] Case 3 threw", error.message);
    }

    console.log(
        `===== Exploration Placement Planner Test: ${passed} passed, ${failed} failed =====\n`
    );
}
