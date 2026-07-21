import { deriveDisabledReason } from "./MultiplayerDisabledReason.js";
import { createMultiplayerUiModel } from "./MultiplayerUiModel.js";
import {
    MultiplayerConnectionState,
    MultiplayerLobbyState,
    MultiplayerMode,
    MultiplayerSessionState
} from "./MultiplayerUiState.js";
import { HostLobbyPanel } from "./HostLobbyPanel.js";
import { GuestJoinPanel } from "./GuestJoinPanel.js";
import { MultiplayerStatusPanel } from "./MultiplayerStatusPanel.js";
import { SessionControlPanel } from "./SessionControlPanel.js";

export class MultiplayerUiController {
    constructor({
        root,
        mode = MultiplayerMode.HOST,
        actions = {}
    } = {}) {
        this.root = root;
        this.actions = actions;
        this.destroyed = false;
        this.state = createMultiplayerUiModel({ mode });
        this.hostPanel = new HostLobbyPanel(actions);
        this.guestPanel = new GuestJoinPanel(actions);
        this.statusPanel = new MultiplayerStatusPanel();
        this.sessionPanel = new SessionControlPanel({
            onAction: actions.onAction
        });
    }

    update(partial = {}) {
        if (this.destroyed) return this.state;
        const next = {
            ...this.state,
            ...partial
        };
        next.disabledReason = partial.disabledReason ?? deriveDisabledReason({
            roomClosed: next.lobbyState === MultiplayerLobbyState.CLOSED ||
                next.sessionState === MultiplayerSessionState.CLOSED,
            gameEnded: next.sessionState === MultiplayerSessionState.GAME_ENDED,
            connectionLost: next.connectionState === MultiplayerConnectionState.DISCONNECTED ||
                next.connectionState === MultiplayerConnectionState.FAILED,
            sessionResuming: next.sessionState === MultiplayerSessionState.RESUMING,
            waitingForSession: next.sessionState === MultiplayerSessionState.WAITING_TO_START,
            waitingForBinding: next.sessionState === MultiplayerSessionState.STARTING &&
                !next.playerId,
            localTargetRequired: Boolean(partial.localTargetRequired),
            projection: next.projection
        });
        next.actions = Array.isArray(next.projection?.actions)
            ? next.projection.actions
            : next.actions;
        next.currentPlayerId = next.projection?.turn?.playerId || next.currentPlayerId;
        next.currentPlayerName = next.projection?.turn?.displayName || next.currentPlayerName;
        next.playerId = next.projection?.character?.playerId || next.playerId;
        next.playerName = next.projection?.character?.displayName || next.playerName;
        if (next.projection?.victory?.completed) {
            next.sessionState = MultiplayerSessionState.GAME_ENDED;
        }
        this.state = createMultiplayerUiModel(next);
        this.render();
        return this.state;
    }

    getModel() {
        return this.state;
    }

    render() {
        if (this.destroyed || !this.root) return;
        const children = [];
        if (this.state.mode === MultiplayerMode.HOST) {
            children.push(this.hostPanel.render(this.state));
        }
        if (this.state.mode === MultiplayerMode.GUEST) {
            children.push(this.guestPanel.render(this.state));
        }
        children.push(this.statusPanel.render(this.state));
        children.push(this.sessionPanel.render(this.state));
        this.root.replaceChildren(...children);
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.hostPanel.destroy();
        this.guestPanel.destroy();
        this.statusPanel.destroy();
        this.sessionPanel.destroy();
        this.root?.replaceChildren?.();
    }
}
