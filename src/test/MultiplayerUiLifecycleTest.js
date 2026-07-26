import { createGameApplication } from "../bootstrap/createGameApplication.js";
import { MultiplayerMode } from "../multiplayer/ui/MultiplayerUiState.js";
import { findButton, installTestDom } from "./TestDom.js";

export function runMultiplayerUiLifecycleTest() {
    installTestDom();
    console.log("\n===== Multiplayer UI Lifecycle Test =====");
    let passed = 0;
    let failed = 0;
    const assert = (ok, label) => {
        ok ? passed++ : failed++;
        console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
    };

    try {
        Object.defineProperty(global, "window", {
            value: { location: { href: "http://localhost:5173/" } },
            configurable: true
        });
        const root = document.createElement("section");
        let activeCount = 0;
        let destroyedCount = 0;
        let visibleEffects = 0;
        const makeFakeApp = () => {
            activeCount++;
            const button = document.createElement("button");
            button.textContent = "Effect";
            const handler = () => { visibleEffects++; };
            button.addEventListener("click", handler);
            root.appendChild(button);
            let destroyed = false;
            return {
                emitOneEffect() {
                    button.click();
                },
                destroy() {
                    if (destroyed) return;
                    destroyed = true;
                    activeCount--;
                    destroyedCount++;
                    button.removeEventListener("click", handler);
                    root.replaceChildren();
                }
            };
        };

        const app = createGameApplication({
            root,
            localAppFactory: makeFakeApp,
            hostAppFactory: makeFakeApp,
            guestAppFactory: makeFakeApp
        });

        assert(
            app.getActiveMode() === MultiplayerMode.HOST,
            "Case 1: Root URL opens Host mode directly"
        );
        app.switchMode(MultiplayerMode.LOCAL);
        app.switchMode(MultiplayerMode.HOST);
        app.switchMode(MultiplayerMode.GUEST);
        app.switchMode(MultiplayerMode.LOCAL);
        assert(activeCount === 1, "Case 2: Host -> Local -> Host -> Guest -> Local keeps one active app");
        assert(destroyedCount === 4, "Case 3: mode switching destroys old app");

        for (let i = 0; i < 10; i++) {
            app.switchMode(i % 2 === 0 ? MultiplayerMode.HOST : MultiplayerMode.GUEST);
        }
        assert(activeCount === 1, "Case 4: ten lifecycle cycles keep one active app");
        findButton(root, "Effect")?.click();
        assert(visibleEffects === 1, "Case 5: one event after ten cycles creates one visible effect");

        app.destroy();
        app.destroy();
        assert(activeCount === 0, "Case 6: destroy is idempotent");
    } catch (error) {
        failed++;
        console.log("[FAIL] Multiplayer UI Lifecycle threw", error.message);
    }

    console.log(`===== Multiplayer UI Lifecycle Test: ${passed} passed, ${failed} failed =====\n`);
}
