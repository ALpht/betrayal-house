import { createLocalGameDom } from "./createLocalGameDom.js";
import { createHostLanGameApp } from "./createHostLanGameApp.js";
import { createGuestLanGameApp } from "./createGuestLanGameApp.js";
import { MultiplayerEntryPanel } from "../multiplayer/ui/MultiplayerEntryPanel.js";
import { MultiplayerMode } from "../multiplayer/ui/MultiplayerUiState.js";

export function createGameApplication({
    root,
    localAppFactory = createLocalGameDom,
    hostAppFactory = createHostLanGameApp,
    guestAppFactory = createGuestLanGameApp
}) {
    let activeApp = null;
    let activeMode = MultiplayerMode.ENTRY;
    let lifecycleGeneration = 0;
    let destroyed = false;

    function switchMode(mode) {
        if (destroyed) return;

        activeApp?.destroy?.();
        activeApp = null;
        activeMode = mode;
        lifecycleGeneration++;
        root.innerHTML = "";

        const generation = lifecycleGeneration;
        const isCurrent = () => !destroyed && generation === lifecycleGeneration;

        if (mode === MultiplayerMode.LOCAL) {
            activeApp = localAppFactory({ root });
            return;
        }

        if (mode === MultiplayerMode.HOST) {
            activeApp = hostAppFactory({
                root,
                isCurrent,
                onReturnToEntry: () => switchMode(MultiplayerMode.ENTRY),
                onNewLanGame: () => switchMode(MultiplayerMode.HOST)
            });
            return;
        }

        if (mode === MultiplayerMode.GUEST) {
            activeApp = guestAppFactory({
                root,
                isCurrent,
                onReturnToEntry: () => switchMode(MultiplayerMode.ENTRY)
            });
            return;
        }

        const entry = new MultiplayerEntryPanel({
            onLocal: () => switchMode(MultiplayerMode.LOCAL),
            onHost: () => switchMode(MultiplayerMode.HOST),
            onGuest: () => switchMode(MultiplayerMode.GUEST)
        });
        root.appendChild(entry.render());
        activeApp = entry;
    }

    switchMode(MultiplayerMode.ENTRY);

    return {
        getActiveMode() {
            return activeMode;
        },
        getGeneration() {
            return lifecycleGeneration;
        },
        switchMode,
        destroy() {
            if (destroyed) return;
            destroyed = true;
            lifecycleGeneration++;
            activeApp?.destroy?.();
            activeApp = null;
            root.innerHTML = "";
        }
    };
}
