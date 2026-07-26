import { deriveDisabledReason, MultiplayerDisabledReason } from "../multiplayer/ui/MultiplayerDisabledReason.js";
import { createMultiplayerUiModel, getMultiplayerUiModelFields } from "../multiplayer/ui/MultiplayerUiModel.js";
import { MultiplayerUiController } from "../multiplayer/ui/MultiplayerUiController.js";
import { MultiplayerConnectionState, MultiplayerMode, MultiplayerSessionState } from "../multiplayer/ui/MultiplayerUiState.js";
import { findButton, installTestDom, textOf } from "./TestDom.js";

export function runMultiplayerSessionUiTest() {
    installTestDom();
    console.log("\n===== Multiplayer Session UI Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        const model = createMultiplayerUiModel({
            mode: MultiplayerMode.GUEST,
            resumeToken: "secret",
            socketId: "socket-1",
            rawProjection: { secret: true },
            projection: { turn: { isViewerTurn: false } }
        });
        const fields = Object.keys(model);
        const allowed = getMultiplayerUiModelFields();
        assert(fields.every(field => allowed.includes(field)), "Case 1: UI model follows allowlist");
        assert(!("resumeToken" in model) && !("socketId" in model), "Case 2: UI model excludes sensitive identifiers");

        const reason = deriveDisabledReason({
            projection: {
                turn: { isViewerTurn: false },
                actions: [{ type: "COLLECT", enabled: false }]
            }
        });
        assert(reason === MultiplayerDisabledReason.NOT_YOUR_TURN, "Case 3: disabled reason uses viewer-safe turn projection");

        const root = document.createElement("section");
        let sent = 0;
        let lastAction = null;
        const controller = new MultiplayerUiController({
            root,
            mode: MultiplayerMode.GUEST,
            actions: {
                onAction: action => {
                    sent++;
                    lastAction = action;
                }
            }
        });
        controller.update({
            connectionState: MultiplayerConnectionState.CONNECTED,
            sessionState: MultiplayerSessionState.ACTIVE,
            projection: {
                gameEnded: false,
                turn: { playerId: "p1", displayName: "Brandon", isViewerTurn: true },
                character: { playerId: "p1", displayName: "Brandon" },
                actions: [{ type: "COLLECT", label: "Collect", enabled: true }],
                cards: [],
                scenario: { title: "Relic Escape" },
                victory: { completed: false }
            }
        });
        findButton(root, "Collect")?.click();
        assert(sent === 1, "Case 4: current viewer action is enabled once");
        assert(
            textOf(root).includes("Brandon") &&
                !textOf(root).includes("Assigned") &&
                !textOf(root).includes("Leave Game"),
            "Case 5: compact character identity renders without redundant labels"
        );

        controller.update({
            projection: {
                gameEnded: false,
                turn: { playerId: "p1", displayName: "Brandon", isViewerTurn: true },
                character: { playerId: "p1", displayName: "Brandon" },
                actions: [
                    { type: "MOVE", label: "↑ North", enabled: true, payload: { direction: "north" } },
                    { type: "MOVE", label: "← West", enabled: true, payload: { direction: "west" } },
                    { type: "MOVE", label: "→ East", enabled: true, payload: { direction: "east" } },
                    { type: "MOVE", label: "↓ South", enabled: true, payload: { direction: "south" } },
                    { type: "END_TURN", label: "End Turn", enabled: true }
                ],
                cards: [],
                scenario: { title: "Exploration" },
                victory: { completed: false }
            }
        });
        findButton(root, "→ East")?.click();
        assert(
            sent === 2 &&
                lastAction?.type === "MOVE" &&
                lastAction?.payload?.direction === "east" &&
                findButton(root, "↑ North") &&
                findButton(root, "← West") &&
                findButton(root, "↓ South") &&
                findButton(root, "End Turn"),
            "Case 5a: Guest renders four direction controls and a reachable End Turn"
        );

        controller.update({
            connectionState: MultiplayerConnectionState.CONNECTED,
            projection: {
                gameEnded: true,
                turn: { playerId: "p1", displayName: "Brandon", isViewerTurn: true },
                character: { playerId: "p1", displayName: "Brandon" },
                actions: [{ type: "COLLECT", label: "Collect", enabled: true }],
                victory: { completed: true, winner: "heroes", reason: "escaped" }
            }
        });
        findButton(root, "Collect")?.click();
        assert(sent === 2, "Case 6: victory disables actions");
        assert(textOf(root).includes("The game has ended."), "Case 7: game-ended disabled reason renders");
        controller.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Multiplayer Session UI threw", error.message);
    }

    console.log(`===== Multiplayer Session UI Test: ${passed} passed, ${failed} failed =====\n`);
}
