import { HouseMapPresentationQuery } from "../presentation/query/HouseMapPresentationQuery.js";
import { HouseMapPanel } from "../presentation/panel/HouseMapPanel.js";
import { findFirst, installTestDom, textOf } from "./TestDom.js";

function countNodes(node, predicate) {
    if (!node) return 0;
    return (predicate(node) ? 1 : 0) +
        node.children.reduce((total, child) =>
            total + countNodes(child, predicate), 0
        );
}

function projection() {
    return {
        map: {
            rooms: [
                {
                    roomId: 1,
                    name: "Entrance Hall",
                    x: -1,
                    y: 0,
                    rotation: 0,
                    isRevealed: true,
                    connections: [2]
                },
                {
                    roomId: 2,
                    name: "Gallery",
                    x: 0,
                    y: 0,
                    rotation: 90,
                    isRevealed: true,
                    connections: [1]
                }
            ],
            players: [
                { playerId: "p1", displayName: "Brandon", roomId: 1 },
                { playerId: "p2", displayName: "Ox", roomId: 2 }
            ],
            currentPlayerId: "p2"
        }
    };
}

export function runHouseMapPresentationTest() {
    installTestDom();
    console.log("\n===== House Map Presentation Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        const query = new HouseMapPresentationQuery();
        const model = query.buildModel(projection());
        assert(
            model.rooms.length === 2 &&
                model.rooms[0].x === -1 &&
                model.players.find(player => player.playerId === "p2")?.isCurrentPlayer,
            "Case 1: Projection becomes normalized map presentation"
        );
        assert(
            Object.isFrozen(model) &&
                Object.isFrozen(model.rooms) &&
                Object.isFrozen(model.rooms[0]) &&
                Object.isFrozen(model.rooms[0].connections) &&
                Object.isFrozen(model.players) &&
                Object.isFrozen(model.players[0]),
            "Case 2: Presentation model is deeply frozen"
        );
        const focused = query.buildModel(projection(), {
            focusPlayerId: "p2",
            includePlayerMarkers: false
        });
        assert(
            focused.rooms.length === 1 &&
                focused.rooms[0].roomId === 2 &&
                focused.rooms[0].connections.length === 0 &&
                focused.players.length === 0,
            "Case 2a: Guest focus contains only the assigned character room"
        );

        const container = document.createElement("section");
        const panel = new HouseMapPanel({ container });
        panel.render(model);
        const current = findFirst(container, node =>
            node.className?.includes("house-map-player current")
        );
        assert(
            countNodes(container, node => node.className === "house-map-room") === 2 &&
                textOf(container).includes("Entrance Hall") &&
                textOf(container).includes("Gallery"),
            "Case 3: Multiple room coordinates render"
        );
        assert(
            current?.getAttribute("data-player-id") === "p2" &&
                current?.getAttribute("aria-current") === "true",
            "Case 4: Player marker and current-player highlight render"
        );

        panel.render(query.buildModel({
            map: {
                rooms: [{
                    roomId: 1,
                    name: "Entrance Hall",
                    x: 0,
                    y: 0,
                    rotation: 0,
                    isRevealed: true,
                    connections: []
                }],
                players: [{ playerId: "p1", displayName: "Brandon", roomId: 1 }],
                currentPlayerId: "p1"
            }
        }));
        assert(
            countNodes(container, node => node.className === "house-map-room") === 1 &&
                countNodes(container, node => node.className?.includes("house-map-player")) === 1 &&
                !textOf(container).includes("Gallery"),
            "Case 5: Re-render removes stale rooms and markers"
        );

        panel.render(query.buildModel(null));
        assert(
            textOf(container).includes("Waiting for the house to be revealed."),
            "Case 6: Empty projection renders safe fallback"
        );

        const malformed = query.buildModel({
            map: {
                rooms: [
                    { roomId: "valid", name: "Valid", x: 0, y: 0, rotation: 0, connections: ["far"] },
                    { roomId: "far", name: "Far", x: 3, y: 2, rotation: 0, connections: ["valid"] },
                    { roomId: "bad", name: "Bad", x: Infinity, y: 0, rotation: 0, connections: [] }
                ],
                players: [
                    { playerId: "visible", displayName: "Visible", roomId: "valid" },
                    { playerId: "missing", displayName: "Missing", roomId: "hidden" }
                ],
                currentPlayerId: "missing"
            }
        });
        panel.render(malformed);
        assert(
            malformed.rooms.length === 2 &&
                malformed.players.length === 1 &&
                countNodes(container, node =>
                    node.className === "house-map-connection horizontal" ||
                    node.className === "house-map-connection vertical"
                ) === 0,
            "Case 7: Malformed and unsupported geometry are ignored safely"
        );

        panel.destroy();
        panel.destroy();
        assert(
            container.children.length === 0,
            "Case 8: Passive panel destroy is deterministic"
        );
    } catch (error) {
        failed++;
        console.log("[FAIL] House Map Presentation threw", error.message);
    }

    console.log(`===== House Map Presentation Test: ${passed} passed, ${failed} failed =====\n`);
}
