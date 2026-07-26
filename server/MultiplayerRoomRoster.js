import {
    RosterConnectionState,
    RosterMembershipState,
    RosterReadiness
} from "./ServerMessageType.js";
import { CharacterDefinitions } from "../src/data/CharacterDefinitions.js";

function createGuestId() {
    return `guest-${crypto.randomUUID()}`;
}

function normalizeDisplayName(value) {
    return String(value || "").trim();
}

function shuffledCharacters(definitions, random) {
    const characters = [...definitions];
    for (let index = characters.length - 1; index > 0; index--) {
        const target = Math.floor(random() * (index + 1));
        [characters[index], characters[target]] = [
            characters[target],
            characters[index]
        ];
    }
    return characters;
}

export class MultiplayerRoomRoster {
    constructor({
        guestIdFactory = createGuestId,
        characterDefinitions = CharacterDefinitions,
        random = Math.random
    } = {}) {
        this.guestIdFactory = guestIdFactory;
        this.characterDefinitions = shuffledCharacters(
            characterDefinitions,
            random
        );
        this.members = new Map();
        this.guestIdsByConnectionId = new Map();
        this.nextJoinOrder = 1;
    }

    addGuest({ connectionId, displayName }) {
        const name = normalizeDisplayName(displayName);
        const guestId = this.guestIdFactory();
        const assignedCharacterIds = new Set(
            [...this.members.values()]
                .filter(member =>
                    member.membershipState === RosterMembershipState.ACTIVE
                )
                .map(member => member.publicCharacterId)
                .filter(Boolean)
        );
        const character = this.characterDefinitions.find(
            candidate => !assignedCharacterIds.has(candidate.id)
        ) || null;
        const member = {
            guestId,
            currentConnectionId: connectionId,
            displayName: name,
            membershipState: RosterMembershipState.ACTIVE,
            connectionState: RosterConnectionState.CONNECTED,
            readiness: RosterReadiness.NOT_READY,
            joinOrder: this.nextJoinOrder++,
            playerId: null,
            publicCharacterId: character?.id || null,
            publicPlayerName: character?.name || null,
            publicCharacterName: character?.name || null
        };

        this.members.set(guestId, member);
        this.guestIdsByConnectionId.set(connectionId, guestId);
        return this.#clone(member);
    }

    getByGuestId(guestId) {
        const member = this.members.get(guestId);
        return member ? this.#clone(member) : null;
    }

    getByConnectionId(connectionId) {
        const guestId = this.guestIdsByConnectionId.get(connectionId);
        return guestId ? this.getByGuestId(guestId) : null;
    }

    getInternalByConnectionId(connectionId) {
        const guestId = this.guestIdsByConnectionId.get(connectionId);
        return guestId ? this.members.get(guestId) || null : null;
    }

    getInternalByGuestId(guestId) {
        return this.members.get(guestId) || null;
    }

    markReadyByConnectionId(connectionId, ready) {
        const member = this.getInternalByConnectionId(connectionId);
        if (!member || member.membershipState !== RosterMembershipState.ACTIVE) {
            return null;
        }

        member.readiness = ready
            ? RosterReadiness.READY
            : RosterReadiness.NOT_READY;
        return this.#clone(member);
    }

    markDisconnected(connectionId) {
        const member = this.getInternalByConnectionId(connectionId);
        if (!member || member.membershipState !== RosterMembershipState.ACTIVE) {
            return null;
        }

        member.connectionState = RosterConnectionState.RECONNECTING;
        this.guestIdsByConnectionId.delete(connectionId);
        return this.#clone(member);
    }

    markReconnected({ guestId, connectionId }) {
        const member = this.getInternalByGuestId(guestId);
        if (!member || member.membershipState !== RosterMembershipState.ACTIVE) {
            return null;
        }

        if (member.currentConnectionId) {
            this.guestIdsByConnectionId.delete(member.currentConnectionId);
        }

        member.currentConnectionId = connectionId;
        member.connectionState = RosterConnectionState.CONNECTED;
        this.guestIdsByConnectionId.set(connectionId, guestId);
        return this.#clone(member);
    }

    removeWaitingGuest(connectionId) {
        const member = this.getInternalByConnectionId(connectionId);
        if (!member) {
            return null;
        }

        this.guestIdsByConnectionId.delete(connectionId);
        this.members.delete(member.guestId);
        return this.#clone(member);
    }

    markLeft(connectionIdOrGuestId) {
        const member =
            this.getInternalByConnectionId(connectionIdOrGuestId) ||
            this.getInternalByGuestId(connectionIdOrGuestId);
        if (!member) {
            return null;
        }

        if (member.currentConnectionId) {
            this.guestIdsByConnectionId.delete(member.currentConnectionId);
        }

        member.membershipState = RosterMembershipState.LEFT;
        member.connectionState = RosterConnectionState.DISCONNECTED;
        member.readiness = RosterReadiness.NOT_READY;
        return this.#clone(member);
    }

    assignPlayer({ guestId, playerId, publicPlayerName, publicCharacterName }) {
        const member = this.getInternalByGuestId(guestId);
        if (!member) {
            return null;
        }

        member.playerId = playerId;
        member.publicPlayerName = publicPlayerName || null;
        member.publicCharacterName = publicCharacterName || null;
        return this.#clone(member);
    }

    getActiveMembers() {
        return [...this.members.values()]
            .filter(member => member.membershipState === RosterMembershipState.ACTIVE)
            .sort((a, b) => a.joinOrder - b.joinOrder)
            .map(member => this.#clone(member));
    }

    getConnectedActiveMembers() {
        return this.getActiveMembers()
            .filter(member => member.connectionState === RosterConnectionState.CONNECTED);
    }

    hasConnection(connectionId) {
        return this.guestIdsByConnectionId.has(connectionId);
    }

    toPublicJSON() {
        return this.getActiveMembers().map(member => ({
            guestId: member.guestId,
            displayName: member.displayName,
            membershipState: member.membershipState,
            connectionState: member.connectionState,
            readiness: member.readiness,
            joinOrder: member.joinOrder,
            playerId: member.playerId,
            publicCharacterId: member.publicCharacterId,
            publicPlayerName: member.publicPlayerName,
            publicCharacterName: member.publicCharacterName
        }));
    }

    #clone(member) {
        return member ? structuredClone(member) : null;
    }
}
