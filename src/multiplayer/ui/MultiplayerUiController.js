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
import { SessionControlPanel } from "./SessionControlPanel.js";
import { HouseMapPresentationQuery } from "../../presentation/query/HouseMapPresentationQuery.js";
import { HouseMapTransitionQuery } from "../../presentation/query/HouseMapTransitionQuery.js";

export class MultiplayerUiController {
    constructor({
        root,
        mode = MultiplayerMode.HOST,
        actions = {}
    } = {}) {
        this.root = root;
        this.actions = actions;
        this.destroyed = false;
        this.houseMapQuery = new HouseMapPresentationQuery();
        this.houseMapTransitionQuery = new HouseMapTransitionQuery();
        this.previousFullHouseMapModel = null;
        this.state = createMultiplayerUiModel({
            mode,
            houseMapModel: this.houseMapQuery.buildModel(null)
        });
        this.hostPanel = new HostLobbyPanel(actions);
        this.guestPanel = new GuestJoinPanel(actions);
        this.sessionPanel = new SessionControlPanel({
            onAction: actions.onAction
        });
    }

    update(partial = {}) {
        if (this.destroyed) return this.state;
        const hasProjectionUpdate = Object.prototype.hasOwnProperty.call(
            partial,
            "projection"
        );
        const modeChanged = partial.mode && partial.mode !== this.state.mode;
        const guestStartedResuming =
            (partial.mode || this.state.mode) === MultiplayerMode.GUEST &&
            partial.sessionState === MultiplayerSessionState.RESUMING &&
            this.state.sessionState !== MultiplayerSessionState.RESUMING;
        const sessionClosed =
            partial.sessionState === MultiplayerSessionState.CLOSED;
        if (modeChanged || guestStartedResuming || sessionClosed) {
            this.previousFullHouseMapModel = null;
        }
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
        let renderedTransition = null;
        let fullHouseMapModel = null;
        if (hasProjectionUpdate) {
            if (next.projection) {
                fullHouseMapModel = this.houseMapQuery.buildModel(next.projection);
                const fullTransition = this.houseMapTransitionQuery.buildTransition(
                    this.previousFullHouseMapModel,
                    fullHouseMapModel
                );
                renderedTransition = next.mode === MultiplayerMode.GUEST
                    ? this.houseMapTransitionQuery.focusForPlayer(
                        fullTransition,
                        next.playerId
                    )
                    : fullTransition;
                next.houseMapModel = next.mode === MultiplayerMode.GUEST
                    ? this.houseMapQuery.buildModel(next.projection, {
                        focusPlayerId: next.playerId,
                        includePlayerMarkers: true
                    })
                    : fullHouseMapModel;
            } else {
                this.previousFullHouseMapModel = null;
                next.houseMapModel = this.houseMapQuery.buildModel(null);
            }
        }
        if (next.projection?.victory?.completed) {
            next.sessionState = MultiplayerSessionState.GAME_ENDED;
        }
        this.state = createMultiplayerUiModel(next);
        this.render(renderedTransition);
        if (fullHouseMapModel) {
            this.previousFullHouseMapModel = fullHouseMapModel;
        }
        return this.state;
    }

    getModel() {
        return this.state;
    }

    render(transition = null) {
        if (this.destroyed || !this.root) return;
        const children = [];
        if (this.state.mode === MultiplayerMode.HOST) {
            children.push(this.hostPanel.render(this.state, transition));
        }
        if (this.state.mode === MultiplayerMode.GUEST) {
            children.push(this.guestPanel.render(this.state));
            if (
                this.state.projection ||
                this.state.sessionState === MultiplayerSessionState.ACTIVE ||
                this.state.sessionState === MultiplayerSessionState.GAME_ENDED ||
                this.state.sessionState === MultiplayerSessionState.RESUMING
            ) {
                children.push(this.sessionPanel.render(this.state, transition));
            } else {
                this.sessionPanel.destroy();
            }
        }
        this.root.replaceChildren(...children);
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.hostPanel.destroy();
        this.guestPanel.destroy();
        this.sessionPanel.destroy();
        this.previousFullHouseMapModel = null;
        this.root?.replaceChildren?.();
    }
}
