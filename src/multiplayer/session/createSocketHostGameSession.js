import { createLocalGameSession } from "../../bootstrap/createLocalGameSession.js";
import { HostTransportGateway } from "../transport/HostTransportGateway.js";
import { MultiplayerProjectionBuilder } from "../state/MultiplayerProjectionBuilder.js";
import { MultiplayerStatePublisher } from "../state/MultiplayerStatePublisher.js";
import { MultiplayerActionCoordinator } from "./MultiplayerActionCoordinator.js";
import {
    MultiplayerPlayerBinding,
    MultiplayerPlayerRole
} from "./MultiplayerPlayerBinding.js";

function createSessionId() {
    return `session-${crypto.randomUUID()}`;
}

export function createSocketHostGameSession({
    transport,
    sessionId = createSessionId(),
    hostClientId,
    guestClientId,
    localSessionOptions = {}
} = {}) {
    if (!hostClientId || !guestClientId) {
        throw new Error("Socket host session requires hostClientId and guestClientId");
    }

    const localSession = createLocalGameSession(localSessionOptions);
    const bindings = new Map();
    let destroyed = false;
    let publishFailure = null;

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

    function createBindings() {
        bindings.clear();
        const players = localSession.getPlayerManager().getAllPlayers();
        const hostPlayer = players[0] || null;
        const guestPlayer = players[1] || null;
        if (!hostPlayer || !guestPlayer) {
            throw new Error("Socket host session requires two local players");
        }

        const hostBinding = new MultiplayerPlayerBinding({
            sessionId,
            clientId: hostClientId,
            playerId: hostPlayer.id,
            viewerId: hostPlayer.id,
            role: MultiplayerPlayerRole.HOST
        });
        const guestBinding = new MultiplayerPlayerBinding({
            sessionId,
            clientId: guestClientId,
            playerId: guestPlayer.id,
            viewerId: guestPlayer.id,
            role: MultiplayerPlayerRole.GUEST
        });
        bindings.set(hostBinding.clientId, hostBinding);
        bindings.set(guestBinding.clientId, guestBinding);
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
        sendState: message => {
            const sent = transport.send(message);
            if (!sent) {
                publishFailure = {
                    code: "PUBLISH_FAILED",
                    revision: message.revision
                };
            }
        }
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
        publishState: viewerClientId => {
            const binding = bindings.get(viewerClientId);
            if (binding) {
                publisher.publishGuestState(binding.viewerId);
            }
        },
        actionCoordinator: coordinator
    }).init();

    return {
        localSession,
        gateway,
        publisher,
        coordinator,
        sessionId,
        start() {
            if (destroyed) {
                return this;
            }
            localSession.start();
            createBindings();
            return this;
        },
        getPlayerBinding(clientId) {
            return bindings.get(clientId) || null;
        },
        getPlayerBindings() {
            return [...bindings.values()];
        },
        getGuestBinding() {
            return bindings.get(guestClientId) || null;
        },
        publishInitialGuestState() {
            const binding = bindings.get(guestClientId);
            return binding ? publisher.publishGuestState(binding.viewerId) : null;
        },
        publishGuestState() {
            const binding = bindings.get(guestClientId);
            return binding ? publisher.publishGuestState(binding.viewerId) : null;
        },
        executeAndPublish({ action }) {
            const result = executeAuthoritativeAction(action);
            if (result.accepted) {
                this.publishGuestState();
            }
            return result;
        },
        getProjection(clientId) {
            const binding = bindings.get(clientId);
            return binding ? projectionBuilder.build(binding.viewerId) : null;
        },
        getPublishFailure() {
            return publishFailure ? structuredClone(publishFailure) : null;
        },
        destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            gateway.destroy();
            bindings.clear();
            localSession.destroy();
            transport.destroy?.();
        }
    };
}
