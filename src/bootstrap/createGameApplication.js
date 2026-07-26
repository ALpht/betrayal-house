import { createLocalGameDom } from "./createLocalGameDom.js";
import { createHostLanGameApp } from "./createHostLanGameApp.js";
import { createGuestLanGameApp } from "./createGuestLanGameApp.js";
import { MultiplayerMode } from "../multiplayer/ui/MultiplayerUiState.js";

export function createGameApplication({
    root,
    localAppFactory = createLocalGameDom,
    hostAppFactory = createHostLanGameApp,
    guestAppFactory = createGuestLanGameApp
}) {
    let activeApp = null;
    let activeMode = MultiplayerMode.HOST;
    let lifecycleGeneration = 0;
    let destroyed = false;

    function switchMode(mode) {
        if (destroyed) return;
        const nextMode = mode === MultiplayerMode.LOCAL || mode === MultiplayerMode.GUEST
            ? mode
            : MultiplayerMode.HOST;

        activeApp?.destroy?.();
        activeApp = null;
        activeMode = nextMode;
        lifecycleGeneration++;
        root.innerHTML = "";

        const generation = lifecycleGeneration;
        const isCurrent = () => !destroyed && generation === lifecycleGeneration;

        if (nextMode === MultiplayerMode.LOCAL) {
            activeApp = localAppFactory({ root });
            return;
        }

        if (nextMode === MultiplayerMode.HOST) {
            activeApp = hostAppFactory({
                root,
                isCurrent,
                onReturnToHost: () => switchMode(MultiplayerMode.HOST),
                onNewLanGame: () => switchMode(MultiplayerMode.HOST)
            });
            return;
        }

        if (nextMode === MultiplayerMode.GUEST) {
            activeApp = guestAppFactory({
                root,
                isCurrent,
                onReturnToHost: () => switchMode(MultiplayerMode.HOST)
            });
            return;
        }
    }

    switchMode(getInitialMode());

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

function getInitialMode() {
    const mode =
        typeof window === "undefined"
            ? null
            : new URL(window.location.href).searchParams.get("mode");

    if (mode === "guest") return MultiplayerMode.GUEST;
    if (mode === "local") return MultiplayerMode.LOCAL;
    return MultiplayerMode.HOST;
}
