import { createLocalGameSession } from "../../bootstrap/createLocalGameSession.js";
import { CharacterDefinitions } from "../../data/CharacterDefinitions.js";
import { HostTransportGateway } from "../transport/HostTransportGateway.js";
import { MultiplayerProjectionBuilder } from "../state/MultiplayerProjectionBuilder.js";
import { MultiplayerStatePublisher } from "../state/MultiplayerStatePublisher.js";
import { readMultiplayerMapState } from "../state/MultiplayerMapStateAdapter.js";
import { MultiplayerActionCoordinator } from "./MultiplayerActionCoordinator.js";
import {
    MultiplayerPlayerBinding,
    MultiplayerPlayerRole
} from "./MultiplayerPlayerBinding.js";
import { MultiplayerPlayerBindingRegistry } from "./MultiplayerPlayerBindingRegistry.js";
import { createRuntimeId } from "../../core/RuntimeId.js";

function createSessionId() {
    return createRuntimeId("session");
}

function normalizeRoster(roster = []) {
    return [...roster]
        .filter(member => member?.guestId && member?.currentConnectionId)
        .sort((a, b) => a.joinOrder - b.joinOrder);
}

function defaultCharacterIds(count) {
    return CharacterDefinitions.slice(0, count).map(character => character.id);
}

export function createSocketHostGameSession({
    transport,
    sessionId = createSessionId(),
    hostClientId,
    guestClientId = null,
    guestRoster = null,
    localSessionOptions = {}
} = {}) {
    const roster = normalizeRoster(
        guestRoster ||
        (guestClientId
            ? [{
                guestId: guestClientId,
                currentConnectionId: guestClientId,
                displayName: "Guest",
                joinOrder: 1
            }]
            : [])
    );

    if (!hostClientId || roster.length < 1) {
        throw new Error("Socket host session requires hostClientId and at least one guest");
    }

    const localSession = createLocalGameSession({
        ...localSessionOptions,
        characterIds: localSessionOptions.characterIds || defaultCharacterIds(roster.length)
    });
    const bindingRegistry = new MultiplayerPlayerBindingRegistry();
    let destroyed = false;
    let publishFailure = null;
    const publicProjectionSubscribers = new Set();

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
        bindingRegistry.clear();
        const players = localSession.getPlayerManager().getAllPlayers();
        if (players.length < roster.length) {
            throw new Error("Socket host session could not create enough players");
        }

        roster.forEach((member, index) => {
            const player = players[index];
            const binding = new MultiplayerPlayerBinding({
                sessionId,
                clientId: member.guestId,
                playerId: player.id,
                viewerId: player.id,
                role: MultiplayerPlayerRole.GUEST
            });
            bindingRegistry.bind({
                guestId: member.guestId,
                connectionId: member.currentConnectionId,
                binding
            });
        });
    }

    const projectionBuilder = new MultiplayerProjectionBuilder({
        getRuntime: () => localSession.getRuntime(),
        getRouter: () => localSession.getRouter(),
        getTurnManager: () => localSession.getTurnManager(),
        getPlayerManager: () => localSession.getPlayerManager(),
        getVictoryResult: () => localSession.getLastVictoryResult(),
        isGameEnded: () => localSession.isGameEnded(),
        getMapState: () => readMultiplayerMapState(localSession)
    });
    const publisher = new MultiplayerStatePublisher({
        sessionId,
        getProjection: viewerId => projectionBuilder.build(viewerId),
        sendState: (message, options = {}) => {
            const sent = transport.send(message, {
                targetClientId: options.targetClientId
            });
            if (!sent) {
                publishFailure = {
                    code: "PUBLISH_FAILED",
                    revision: message.revision
                };
            }
        }
    });
    const coordinator = new MultiplayerActionCoordinator({
        getPlayerBinding: connectionId =>
            bindingRegistry.resolveByConnectionId(connectionId) || null,
        executeAuthoritativeAction,
        isGameEnded: () => localSession.isGameEnded()
    });
    const gateway = new HostTransportGateway({
        transport,
        sessionId,
        executeAction: action => localSession.dispatchScenarioAction(action),
        publishState: () => {
            session.publishAuthoritativeState();
        },
        actionCoordinator: coordinator
    }).init();

    const session = {
        localSession,
        gateway,
        publisher,
        coordinator,
        bindingRegistry,
        sessionId,
        start() {
            if (destroyed) {
                return this;
            }
            localSession.start();
            createBindings();
            return this;
        },
        getPlayerBinding(connectionOrGuestId) {
            return bindingRegistry.resolveByConnectionId(connectionOrGuestId) ||
                bindingRegistry.resolveByGuestId(connectionOrGuestId);
        },
        getPlayerBindings() {
            return bindingRegistry.getAll();
        },
        getGuestBinding(connectionOrGuestId = guestClientId) {
            return this.getPlayerBinding(connectionOrGuestId);
        },
        restoreGuestConnection({ guestId, oldConnectionId, newConnectionId }) {
            const member = roster.find(candidate => candidate.guestId === guestId);
            if (member) {
                member.currentConnectionId = newConnectionId;
            }
            return bindingRegistry.replaceConnection({
                guestId,
                oldConnectionId,
                newConnectionId
            });
        },
        getPublicAssignments() {
            const players = localSession.getPlayerManager().getAllPlayers();
            return roster.map((member, index) => {
                const player = players[index] || null;
                return {
                    guestId: member.guestId,
                    connectionId: member.currentConnectionId,
                    playerId: player?.id || null,
                    publicPlayerName: player?.name || null,
                    publicCharacterName: player?.character?.name || player?.name || null
                };
            });
        },
        publishInitialGuestState() {
            return this.publishAuthoritativeState();
        },
        publishGuestState(connectionOrGuestId = guestClientId) {
            const binding = this.getPlayerBinding(connectionOrGuestId);
            const member = roster.find(candidate =>
                candidate.guestId === connectionOrGuestId ||
                candidate.currentConnectionId === connectionOrGuestId ||
                candidate.guestId === binding?.clientId
            );
            const targetClientId = member?.currentConnectionId || connectionOrGuestId;
            return binding
                ? publisher.publishGuestState(binding.viewerId, { targetClientId })
                : null;
        },
        publishAuthoritativeState({ connectedClientIds = null } = {}) {
            const allowed = connectedClientIds ? new Set(connectedClientIds) : null;
            const messages = roster
                .filter(member => !allowed || allowed.has(member.currentConnectionId))
                .map(member => this.publishGuestState(member.currentConnectionId))
                .filter(Boolean);
            const publicProjection = projectionBuilder.buildPublic();
            for (const handler of [...publicProjectionSubscribers]) {
                handler(structuredClone(publicProjection));
            }
            return messages;
        },
        publishAllGuestStates(options = {}) {
            return this.publishAuthoritativeState(options);
        },
        executeAndPublish({ action }) {
            const result = executeAuthoritativeAction(action);
            if (result.accepted) {
                this.publishAuthoritativeState();
            }
            return result;
        },
        getProjection(connectionOrGuestId) {
            const binding = this.getPlayerBinding(connectionOrGuestId);
            return binding ? projectionBuilder.build(binding.viewerId) : null;
        },
        getPublicProjection() {
            return projectionBuilder.buildPublic();
        },
        subscribePublicProjection(handler) {
            if (destroyed || typeof handler !== "function") {
                return () => {};
            }
            publicProjectionSubscribers.add(handler);
            return () => publicProjectionSubscribers.delete(handler);
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
            publicProjectionSubscribers.clear();
            bindingRegistry.clear();
            localSession.destroy();
            transport.destroy?.();
        }
    };

    return session;
}
