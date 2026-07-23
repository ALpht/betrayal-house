import { MultiplayerRoomRoster } from "./MultiplayerRoomRoster.js";
import {
    LobbyRole,
    LobbyRoomStatus,
    RosterConnectionState
} from "./ServerMessageType.js";

const DEFAULT_PLAYER_COUNT = 2;
const MIN_PLAYER_COUNT = 2;
const MAX_PLAYER_COUNT = 3;

export function normalizePlayerCount(value) {
    const number = Number(value || DEFAULT_PLAYER_COUNT);
    if (!Number.isInteger(number) || number < MIN_PLAYER_COUNT || number > MAX_PLAYER_COUNT) {
        return null;
    }
    return number;
}

export class LobbyRoom {
    constructor({
        roomId,
        roomCode,
        hostClientId,
        playerCount = DEFAULT_PLAYER_COUNT,
        roster = new MultiplayerRoomRoster()
    }) {
        const normalizedPlayerCount = normalizePlayerCount(playerCount);
        if (!normalizedPlayerCount) {
            throw new Error("Room playerCount must be 2 or 3");
        }

        this.roomId = roomId;
        this.roomCode = roomCode;
        this.hostClientId = hostClientId;
        this.playerCount = normalizedPlayerCount;
        this.sessionId = null;
        this.status = LobbyRoomStatus.WAITING_FOR_PLAYERS;
        this.closeReasonCode = null;
        this.roster = roster;
    }

    get guestClientId() {
        return this.roster.getActiveMembers()[0]?.currentConnectionId || null;
    }

    getGuestClientIds({ connectedOnly = false } = {}) {
        const members = connectedOnly
            ? this.roster.getConnectedActiveMembers()
            : this.roster.getActiveMembers();
        return members
            .map(member => member.currentConnectionId)
            .filter(Boolean);
    }

    addGuest({ connectionId, displayName }) {
        if (this.status !== LobbyRoomStatus.WAITING_FOR_PLAYERS) {
            throw new Error("Room is not waiting for players");
        }

        if (this.roster.getActiveMembers().length >= this.playerCount) {
            throw new Error("Room is full");
        }

        return this.roster.addGuest({ connectionId, displayName });
    }

    markReady(connectionId, ready) {
        return this.roster.markReadyByConnectionId(connectionId, ready);
    }

    markGuestLeft(connectionId) {
        if (this.status === LobbyRoomStatus.WAITING_FOR_PLAYERS) {
            return this.roster.removeWaitingGuest(connectionId);
        }

        if (this.status === LobbyRoomStatus.ACTIVE) {
            const member = this.roster.markLeft(connectionId);
            this.close("PLAYER_LEFT_ACTIVE_SESSION");
            return member;
        }

        return null;
    }

    markGuestReconnecting(connectionId) {
        if (this.status !== LobbyRoomStatus.ACTIVE) {
            throw new Error("Room must be ACTIVE before reconnecting");
        }

        return this.roster.markDisconnected(connectionId);
    }

    markGuestResumed({ guestId, connectionId }) {
        if (this.status !== LobbyRoomStatus.ACTIVE) {
            throw new Error("Room must be ACTIVE before resume");
        }

        return this.roster.markReconnected({ guestId, connectionId });
    }

    getStartEligibility() {
        if (this.status !== LobbyRoomStatus.WAITING_FOR_PLAYERS) {
            return { canStart: false, reasonCode: "SESSION_ALREADY_ACTIVE" };
        }

        const activeMembers = this.roster.getActiveMembers();
        if (activeMembers.length !== this.playerCount) {
            return { canStart: false, reasonCode: "ROSTER_INCOMPLETE" };
        }

        if (activeMembers.some(member =>
            member.connectionState !== RosterConnectionState.CONNECTED
        )) {
            return { canStart: false, reasonCode: "PLAYER_DISCONNECTED" };
        }

        const guestIds = new Set(activeMembers.map(member => member.guestId));
        if (guestIds.size !== activeMembers.length) {
            return { canStart: false, reasonCode: "INVALID_REQUEST" };
        }

        return { canStart: true, reasonCode: null };
    }

    activate(sessionId) {
        const eligibility = this.getStartEligibility();
        if (!eligibility.canStart) {
            throw new Error(eligibility.reasonCode || "Room is not start eligible");
        }

        if (this.roomId === sessionId || this.roomCode === sessionId) {
            throw new Error("sessionId must be distinct from room identity");
        }

        this.sessionId = sessionId;
        this.status = LobbyRoomStatus.ACTIVE;
    }

    close(reasonCode = "ROOM_CLOSED") {
        if (this.status === LobbyRoomStatus.CLOSED) {
            return;
        }

        this.status = LobbyRoomStatus.CLOSED;
        this.closeReasonCode = reasonCode;
    }

    getRole(clientId) {
        if (clientId === this.hostClientId) {
            return LobbyRole.HOST;
        }

        return this.roster.hasConnection(clientId) ? LobbyRole.GUEST : null;
    }

    getMemberByConnectionId(connectionId) {
        return this.roster.getByConnectionId(connectionId);
    }

    getMemberByGuestId(guestId) {
        return this.roster.getByGuestId(guestId);
    }

    getOrderedActiveMembers() {
        return this.roster.getActiveMembers();
    }

    assignPlayer(assignment) {
        return this.roster.assignPlayer(assignment);
    }

    toJSON() {
        const eligibility = this.getStartEligibility();
        return {
            roomId: this.roomId,
            roomCode: this.roomCode,
            hostClientId: this.hostClientId,
            guestClientId: this.guestClientId,
            guestClientIds: this.getGuestClientIds(),
            sessionId: this.sessionId,
            status: this.status,
            playerCount: this.playerCount,
            capacity: this.playerCount,
            canStart: eligibility.canStart,
            startDisabledReason: eligibility.reasonCode,
            roster: this.roster.toPublicJSON()
        };
    }
}
