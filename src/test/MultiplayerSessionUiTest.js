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
        const controller = new MultiplayerUiController({
            root,
            mode: MultiplayerMode.GUEST,
            actions: { onAction: () => { sent++; } }
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
        assert(textOf(root).includes("Brandon"), "Case 5: current and assigned player render");

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
        assert(sent === 1, "Case 6: victory disables actions");
        assert(textOf(root).includes("The game has ended."), "Case 7: game-ended disabled reason renders");
        controller.destroy();
    } catch (error) {
        failed++;
        console.log("[FAIL] Multiplayer Session UI threw", error.message);
    }

    console.log(`===== Multiplayer Session UI Test: ${passed} passed, ${failed} failed =====\n`);
}
