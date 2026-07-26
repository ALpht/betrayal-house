import { HouseMapPresentationModel } from "../presentation/model/HouseMapPresentationModel.js";
import { HouseMapTransitionModel } from "../presentation/model/HouseMapTransitionModel.js";
import { HouseMapPanel } from "../presentation/panel/HouseMapPanel.js";
import { findFirst, installTestDom, textOf } from "./TestDom.js";

function findAll(node, predicate, found = []) {
    if (!node) return found;
    if (predicate(node)) found.push(node);
    for (const child of node.children) findAll(child, predicate, found);
    return found;
}

function mapModel() {
    return new HouseMapPresentationModel({
        rooms: [
            {
                roomId: "a",
                name: "Entrance",
                x: 0,
                y: 0,
                rotation: 0,
                connections: ["b"]
            },
            {
                roomId: "b",
                name: "Gallery",
                x: 1,
                y: 0,
                rotation: 0,
                connections: ["a"]
            }
        ],
        players: [
            {
                playerId: "p1",
                displayName: "Brandon",
                roomId: "b",
                isCurrentPlayer: true
            }
        ],
        currentPlayerId: "p1"
    });
}

export function runHouseMapFeedbackPanelTest() {
    installTestDom();
    console.log("\n===== House Map Feedback Panel Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        const container = document.createElement("section");
        const panel = new HouseMapPanel({ container });
        const model = mapModel();
        panel.render(model, new HouseMapTransitionModel({
            revealedRoomIds: ["b"],
            movedPlayers: [{
                playerId: "p1",
                fromRoomId: "a",
                toRoomId: "b"
            }],
            previousCurrentPlayerId: "p2",
            currentPlayerId: "p1",
            didTurnChange: true
        }));

        const destination = findFirst(container, node =>
            node.getAttribute?.("data-room-id") === "b"
        );
        const marker = findFirst(container, node =>
            node.getAttribute?.("data-player-id") === "p1"
        );
        const connection = findFirst(container, node =>
            node.getAttribute?.("data-connection") === "a::b"
        );
        const live = findFirst(container, node =>
            node.getAttribute?.("aria-live") === "polite"
        );
        assert(
            destination.className.includes("house-map-room--revealed") &&
                destination.className.includes("house-map-room--movement-destination") &&
                marker.className.includes("house-map-player--moved") &&
                marker.className.includes("house-map-player--turn-changed") &&
                marker.className.includes("house-map-player--current"),
            "Case 1: Reveal, movement, and turn feedback compose on one render"
        );
        assert(
            connection.className.includes("house-map-connection--revealed") &&
                connection.getAttribute("data-connection") === "a::b",
            "Case 2: Newly revealed room animates its existing canonical edge"
        );
        assert(
            live?.getAttribute("role") === "status" &&
                textOf(live).includes("New room revealed") &&
                textOf(live).includes("Brandon moved here") &&
                textOf(live).includes("Brandon's turn"),
            "Case 3: Actual transition creates one polite announcement"
        );
        assert(
            findAll(container, node =>
                node.className?.includes("house-map-room-feedback")
            ).every(node => node.getAttribute("aria-hidden") === "true"),
            "Case 4: Visual feedback text does not duplicate live announcements"
        );

        panel.render(model, new HouseMapTransitionModel({
            currentPlayerId: "p1",
            isInitialRender: true
        }));
        assert(
            !findFirst(container, node => node.getAttribute?.("aria-live") === "polite") &&
                !textOf(container).includes("moved here") &&
                Boolean(findFirst(container, node =>
                    node.className?.includes("house-map-player--current")
                )),
            "Case 5: Initial render has no announcement while current turn persists"
        );

        panel.render(model, new HouseMapTransitionModel({
            currentPlayerId: "p1"
        }));
        assert(
            !findFirst(container, node => node.getAttribute?.("aria-live") === "polite"),
            "Case 6: Same-state empty transition has no announcement"
        );

        panel.render(model);
        assert(
            !textOf(container).includes("moved here") &&
                !findFirst(container, node =>
                    node.className?.includes("house-map-player--moved")
                ),
            "Case 7: UI-only render does not replay one-render feedback"
        );
    } catch (error) {
        failed++;
        console.log("[FAIL] House Map Feedback Panel threw", error.message);
    }

    console.log(`===== House Map Feedback Panel Test: ${passed} passed, ${failed} failed =====\n`);
}
