import { createLocalGameSession } from "../../bootstrap/createLocalGameSession.js";
import { HostTransportGateway } from "../transport/HostTransportGateway.js";
import { MultiplayerProjectionBuilder } from "../state/MultiplayerProjectionBuilder.js";
import { MultiplayerStatePublisher } from "../state/MultiplayerStatePublisher.js";
import { MultiplayerActionCoordinator } from "./MultiplayerActionCoordinator.js";
import {
    MultiplayerPlayerBinding,
    MultiplayerPlayerRole
} from "./MultiplayerPlayerBinding.js";

export function createHostGameSession({
    transport,
    sessionId = "local-session",
    localSessionOptions = {}
} = {}) {
    const localSession = createLocalGameSession(localSessionOptions);
    const bindings = new Map();

    function executeAuthoritativeAction(action) {
        try {
            const result = localSession.dispatchScenarioAction(action);
            return result?.success
                ? { accepted: true, reasonCode: null }
                : { accepted: false, reasonCode: "ACTION_REJECTED" };
        } catch (_error) {
            return { accepted: false, reasonCode: "ACTION_REJECTED" };
        }
    }

    function createDefaultBindings() {
        bindings.clear();
        const players = localSession.getPlayerManager().getAllPlayers();
        const hostPlayer = players[0] || null;
        const guestPlayer = players[1] || null;

        if (hostPlayer) {
            const binding = new MultiplayerPlayerBinding({
                sessionId,
                clientId: hostPlayer.id,
                playerId: hostPlayer.id,
                viewerId: hostPlayer.id,
                role: MultiplayerPlayerRole.HOST
            });
            bindings.set(binding.clientId, binding);
        }

        if (guestPlayer) {
            const binding = new MultiplayerPlayerBinding({
                sessionId,
                clientId: guestPlayer.id,
                playerId: guestPlayer.id,
                viewerId: guestPlayer.id,
                role: MultiplayerPlayerRole.GUEST
            });
            bindings.set(binding.clientId, binding);
        }
    }

    const projectionBuilder = new MultiplayerProjectionBuilder({
        getRuntime: () => localSession.getRuntime(),
        getRouter: () => localSession.getRouter(),
        getTurnManager: () => localSession.getTurnManager(),
        getPlayerManager: () => localSession.getPlayerManager(),
        getVictoryResult: () => localSession.getLastVictoryResult(),
        isGameEnded: () => localSession.isGameEnded()
    });
    const publisher = new MultiplayerStatePublisher({
        sessionId,
        getProjection: viewerId => projectionBuilder.build(viewerId),
        sendState: message => transport.send(message)
    });
    const coordinator = new MultiplayerActionCoordinator({
        getPlayerBinding: clientId => bindings.get(clientId) || null,
        executeAuthoritativeAction,
        isGameEnded: () => localSession.isGameEnded()
    });
    const gateway = new HostTransportGateway({
        transport,
        sessionId,
        executeAction: action => localSession.dispatchScenarioAction(action),
        publishState: viewerId => publisher.publishGuestState(viewerId),
        authorizeSender: ({ senderId, actionPlayerId }) => senderId === actionPlayerId,
        actionCoordinator: coordinator
    }).init();

    return {
        localSession,
        gateway,
        publisher,
        coordinator,
        start() {
            localSession.start();
            createDefaultBindings();
            return this;
        },
        publishState(viewerId) {
            return publisher.publishGuestState(viewerId);
        },
        publishGuestState(viewerId) {
            return publisher.publishGuestState(viewerId);
        },
        getProjection(viewerId) {
            return projectionBuilder.build(viewerId);
        },
        getPlayerBinding(clientId) {
            return bindings.get(clientId) || null;
        },
        getPlayerBindings() {
            return [...bindings.values()];
        },
        executeAndPublish({ action, viewerId }) {
            const result = executeAuthoritativeAction(action);
            if (result.accepted && viewerId) {
                publisher.publishGuestState(viewerId);
            }
            return result;
        },
        destroy() {
            gateway.destroy();
            bindings.clear();
            localSession.destroy();
            transport.destroy?.();
        }
    };
}
