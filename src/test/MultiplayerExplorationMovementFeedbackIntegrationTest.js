import { MultiplayerUiController } from "../multiplayer/ui/MultiplayerUiController.js";
import {
    MultiplayerConnectionState,
    MultiplayerMode,
    MultiplayerSessionState
} from "../multiplayer/ui/MultiplayerUiState.js";
import { HouseMapPanel } from "../presentation/panel/HouseMapPanel.js";
import { findFirst, installTestDom, textOf } from "./TestDom.js";

function projection({
    p1Room = "a",
    p2Room = "a",
    currentPlayerId = "p1",
    includeGallery = false,
    viewerId = null
} = {}) {
    return {
        character: viewerId
            ? {
                playerId: viewerId,
                displayName: viewerId === "p1" ? "Brandon" : "Ox"
            }
            : null,
        turn: {
            playerId: currentPlayerId,
            displayName: currentPlayerId === "p1" ? "Brandon" : "Ox"
        },
        map: {
            rooms: [
                {
                    roomId: "a",
                    name: "Entrance",
                    x: 0,
                    y: 0,
                    rotation: 0,
                    isRevealed: true,
                    connections: includeGallery ? ["b"] : []
                },
                ...(includeGallery ? [{
                    roomId: "b",
                    name: "Gallery",
                    x: 1,
                    y: 0,
                    rotation: 0,
                    isRevealed: true,
                    connections: ["a"]
                }] : [])
            ],
            players: [
                { playerId: "p1", displayName: "Brandon", roomId: p1Room },
                { playerId: "p2", displayName: "Ox", roomId: p2Room }
            ],
            currentPlayerId
        },
        actions: [],
        cards: [],
        victory: { completed: false }
    };
}

function activeUpdate(mapProjection) {
    return {
        connectionState: MultiplayerConnectionState.CONNECTED,
        sessionState: MultiplayerSessionState.ACTIVE,
        projection: mapProjection
    };
}

function createController(mode) {
    return new MultiplayerUiController({
        root: document.createElement("main"),
        mode
    });
}

export function runMultiplayerExplorationMovementFeedbackIntegrationTest() {
    installTestDom();
    console.log("\n===== Multiplayer Exploration / Movement Feedback Integration Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        const host = createController(MultiplayerMode.HOST);
        const guestA = createController(MultiplayerMode.GUEST);
        const guestB = createController(MultiplayerMode.GUEST);
        const captured = new Map();
        const captureOriginalRender = HouseMapPanel.prototype.render;
        HouseMapPanel.prototype.render = function(model, transition) {
            if (!captured.has(this)) captured.set(this, []);
            captured.get(this).push({ model, transition });
            return captureOriginalRender.call(this, model, transition);
        };

        try {
            host.update(activeUpdate(projection()));
            guestA.update(activeUpdate(projection({ viewerId: "p1" })));
            guestB.update(activeUpdate(projection({ viewerId: "p2" })));
            const changed = projection({
                p1Room: "b",
                p2Room: "b",
                currentPlayerId: "p2",
                includeGallery: true
            });
            host.update(activeUpdate(changed));
            guestA.update(activeUpdate({
                ...changed,
                character: { playerId: "p1", displayName: "Brandon" }
            }));
            guestB.update(activeUpdate({
                ...changed,
                character: { playerId: "p2", displayName: "Ox" }
            }));

            const hostRender = [...captured.values()][0].at(-1);
            const guestARender = [...captured.values()][1].at(-1);
            const guestBRender = [...captured.values()][2].at(-1);
            assert(
                hostRender.transition.movedPlayers.length === 2 &&
                    guestARender.transition.movedPlayers.length === 1 &&
                    guestARender.transition.movedPlayers[0].playerId === "p1" &&
                    guestBRender.transition.movedPlayers.length === 1 &&
                    guestBRender.transition.movedPlayers[0].playerId === "p2",
                "Case 1: Host sees all movement while each Guest sees only their own"
            );
            assert(
                guestA.getModel().houseMapModel.rooms.length === 1 &&
                    guestA.getModel().houseMapModel.rooms[0].roomId === "b" &&
                    guestA.getModel().houseMapModel.players.length === 1 &&
                    guestA.getModel().houseMapModel.players[0].playerId === "p1",
                "Case 2: Guest immediately focuses the current room and own marker"
            );

            const guestPanelRendersBefore = [...captured.values()][1].length;
            guestA.update({ statusMessage: "Connection monitor refresh" });
            const uiOnlyRender = [...captured.values()][1].at(-1);
            assert(
                [...captured.values()][1].length === guestPanelRendersBefore + 1 &&
                    uiOnlyRender.transition === null &&
                    !textOf(guestA.root).includes("moved here"),
                "Case 3: UI-only refresh cannot replay movement or live feedback"
            );

            guestA.update({
                sessionState: MultiplayerSessionState.RESUMING
            });
            guestA.update(activeUpdate({
                ...changed,
                character: { playerId: "p1", displayName: "Brandon" }
            }));
            const recovered = [...captured.values()][1].at(-1).transition;
            assert(
                recovered.isInitialRender &&
                    recovered.movedPlayers.length === 0 &&
                    recovered.revealedRoomIds.length === 0,
                "Case 4: Guest reconnect recovery starts a fresh no-feedback baseline"
            );

            host.update({ sessionState: MultiplayerSessionState.RESUMING });
            host.update(activeUpdate(changed));
            const hostAfterMonitor = [...captured.values()][0].at(-1).transition;
            assert(
                !hostAfterMonitor.isInitialRender &&
                    hostAfterMonitor.movedPlayers.length === 0,
                "Case 5: Host resuming monitor state does not clear Host baseline"
            );
        } finally {
            HouseMapPanel.prototype.render = captureOriginalRender;
            host.destroy();
            guestA.destroy();
            guestB.destroy();
        }

        const failureController = createController(MultiplayerMode.GUEST);
        failureController.update(activeUpdate(projection({ viewerId: "p1" })));
        const failureOriginalRender = HouseMapPanel.prototype.render;
        let failOnce = true;
        HouseMapPanel.prototype.render = function(model, transition) {
            if (failOnce && transition?.movedPlayers?.length) {
                failOnce = false;
                throw new Error("render failed");
            }
            return failureOriginalRender.call(this, model, transition);
        };
        const moved = projection({
            p1Room: "b",
            includeGallery: true,
            viewerId: "p1"
        });
        let threw = false;
        try {
            failureController.update(activeUpdate(moved));
        } catch {
            threw = true;
        }
        let retriedTransition = null;
        HouseMapPanel.prototype.render = function(model, transition) {
            retriedTransition = transition;
            return failureOriginalRender.call(this, model, transition);
        };
        failureController.update(activeUpdate(moved));
        HouseMapPanel.prototype.render = failureOriginalRender;
        assert(
            threw &&
                retriedTransition?.movedPlayers?.length === 1 &&
                retriedTransition.movedPlayers[0].toRoomId === "b",
            "Case 6: Render failure leaves baseline at the last successful map"
        );
        failureController.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Multiplayer feedback integration threw", error.message);
    }

    console.log(`===== Multiplayer Exploration / Movement Feedback Integration Test: ${passed} passed, ${failed} failed =====\n`);
}
