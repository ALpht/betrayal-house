import { HouseMapPresentationModel } from "../presentation/model/HouseMapPresentationModel.js";
import { HouseMapTransitionQuery } from "../presentation/query/HouseMapTransitionQuery.js";

function model({
    rooms = [],
    players = [],
    currentPlayerId = null
} = {}) {
    return new HouseMapPresentationModel({
        rooms: rooms.map(room => ({
            name: String(room.roomId),
            x: 0,
            y: 0,
            rotation: 0,
            connections: [],
            ...room
        })),
        players: players.map(player => ({
            displayName: player.playerId,
            isCurrentPlayer: player.playerId === currentPlayerId,
            ...player
        })),
        currentPlayerId
    });
}

export function runHouseMapTransitionTest() {
    console.log("\n===== House Map Transition Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        const query = new HouseMapTransitionQuery();
        const previous = model({
            rooms: [{ roomId: "entrance" }],
            players: [
                { playerId: "p1", roomId: "entrance" },
                { playerId: "p2", roomId: "entrance" }
            ],
            currentPlayerId: "p1"
        });
        const current = model({
            rooms: [
                { roomId: "entrance" },
                { roomId: "gallery" },
                { roomId: "attic" }
            ],
            players: [
                { playerId: "p1", roomId: "gallery" },
                { playerId: "p2", roomId: "attic" }
            ],
            currentPlayerId: "p2"
        });

        const initial = query.buildTransition(null, current);
        assert(
            initial.isInitialRender &&
                initial.revealedRoomIds.length === 0 &&
                initial.movedPlayers.length === 0 &&
                !initial.didTurnChange,
            "Case 1: Initial render never fabricates historical feedback"
        );

        const transition = query.buildTransition(previous, current);
        assert(
            JSON.stringify(transition.revealedRoomIds) === JSON.stringify(["attic", "gallery"]) &&
                transition.movedPlayers.length === 2 &&
                transition.didTurnChange &&
                transition.previousCurrentPlayerId === "p1" &&
                transition.currentPlayerId === "p2",
            "Case 2: Full-map comparison detects reveal, all movement, and turn change"
        );
        assert(
            Object.isFrozen(transition) &&
                Object.isFrozen(transition.revealedRoomIds) &&
                Object.isFrozen(transition.movedPlayers) &&
                Object.isFrozen(transition.movedPlayers[0]),
            "Case 3: Transition model is deeply frozen"
        );

        const focused = query.focusForPlayer(transition, "p1");
        assert(
            focused.movedPlayers.length === 1 &&
                focused.movedPlayers[0].playerId === "p1" &&
                focused.revealedRoomIds.length === 2 &&
                focused.didTurnChange &&
                focused.currentPlayerId === "p2",
            "Case 4: Guest focus filters only movedPlayers"
        );

        const duplicate = query.buildTransition(current, current);
        assert(
            !duplicate.isInitialRender &&
                duplicate.revealedRoomIds.length === 0 &&
                duplicate.movedPlayers.length === 0 &&
                !duplicate.didTurnChange,
            "Case 5: Same accepted state creates an empty transition"
        );
    } catch (error) {
        failed++;
        console.log("[FAIL] House Map Transition threw", error.message);
    }

    console.log(`===== House Map Transition Test: ${passed} passed, ${failed} failed =====\n`);
}
