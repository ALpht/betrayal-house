import { LobbyRoom, normalizePlayerCount } from "./LobbyRoom.js";
import {
    LobbyErrorCode,
    LobbyRoomStatus
} from "./ServerMessageType.js";
import { RoomCodeGenerator } from "./RoomCodeGenerator.js";

function createId(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeDisplayName(value) {
    return String(value || "").trim();
}

export class LobbyRegistry {
    constructor({
        roomCodeGenerator = new RoomCodeGenerator(),
        idFactory = createId
    } = {}) {
        this.roomCodeGenerator = roomCodeGenerator;
        this.idFactory = idFactory;
        this.roomsById = new Map();
        this.roomIdsByCode = new Map();
        this.roomIdsByConnectionId = new Map();
    }

    createRoom(hostClientId, { playerCount = 2 } = {}) {
        if (this.roomIdsByConnectionId.has(hostClientId)) {
            return { ok: false, code: LobbyErrorCode.ALREADY_IN_ROOM };
        }

        const normalizedPlayerCount = normalizePlayerCount(playerCount);
        if (!normalizedPlayerCount) {
            return { ok: false, code: LobbyErrorCode.INVALID_REQUEST };
        }

        const existingCodes = new Set(this.roomIdsByCode.keys());
        const roomCode = this.roomCodeGenerator.generate(existingCodes);
        const room = new LobbyRoom({
            roomId: this.idFactory("room"),
            roomCode,
            hostClientId,
            playerCount: normalizedPlayerCount
        });

        this.roomsById.set(room.roomId, room);
        this.roomIdsByCode.set(room.roomCode, room.roomId);
        this.roomIdsByConnectionId.set(hostClientId, room.roomId);

        return { ok: true, room };
    }

    findByCode(roomCode) {
        const roomId = this.roomIdsByCode.get(roomCode);
        return roomId ? this.roomsById.get(roomId) || null : null;
    }

    findByClientId(clientId) {
        const roomId = this.roomIdsByConnectionId.get(clientId);
        return roomId ? this.roomsById.get(roomId) || null : null;
    }

    findByConnectionId(connectionId) {
        return this.findByClientId(connectionId);
    }

    joinRoom({ roomCode, guestClientId, displayName }) {
        if (this.roomIdsByConnectionId.has(guestClientId)) {
            return { ok: false, code: LobbyErrorCode.ALREADY_IN_ROOM };
        }

        const name = normalizeDisplayName(displayName);
        if (!name) {
            return { ok: false, code: LobbyErrorCode.INVALID_DISPLAY_NAME };
        }

        const room = this.findByCode(roomCode);
        if (!room) {
            return { ok: false, code: LobbyErrorCode.ROOM_NOT_FOUND };
        }

        if (room.status === LobbyRoomStatus.CLOSED) {
            return { ok: false, code: LobbyErrorCode.ROOM_CLOSED };
        }

        if (room.status === LobbyRoomStatus.ACTIVE) {
            return { ok: false, code: LobbyErrorCode.ROOM_ACTIVE };
        }

        if (room.getOrderedActiveMembers().length >= room.playerCount) {
            return { ok: false, code: LobbyErrorCode.ROOM_FULL };
        }

        try {
            const member = room.addGuest({
                connectionId: guestClientId,
                displayName: name
            });
            this.roomIdsByConnectionId.set(guestClientId, room.roomId);
            return { ok: true, room, member };
        } catch (_error) {
            return { ok: false, code: LobbyErrorCode.ROOM_FULL };
        }
    }

    setReady({ clientId, ready }) {
        const room = this.findByClientId(clientId);
        if (!room || room.hostClientId === clientId) {
            return { ok: false, code: LobbyErrorCode.INVALID_REQUEST };
        }

        const member = room.markReady(clientId, Boolean(ready));
        if (!member) {
            return { ok: false, code: LobbyErrorCode.INVALID_REQUEST };
        }

        return { ok: true, room, member };
    }

    activateRoom({ hostClientId, sessionId, publicAssignments = null }) {
        const room = this.findByClientId(hostClientId);
        if (!room || room.hostClientId !== hostClientId) {
            return { ok: false, code: LobbyErrorCode.NOT_HOST };
        }

        if (room.status === LobbyRoomStatus.ACTIVE) {
            return { ok: false, code: LobbyErrorCode.SESSION_ALREADY_STARTED };
        }

        const eligibility = room.getStartEligibility();
        if (!eligibility.canStart) {
            return {
                ok: false,
                code: eligibility.reasonCode || LobbyErrorCode.INVALID_REQUEST
            };
        }

        const assignments = this.#validatePublicAssignments(room, publicAssignments);
        if (publicAssignments !== null && !assignments) {
            return { ok: false, code: LobbyErrorCode.BINDING_CREATION_FAILED };
        }

        try {
            room.activate(sessionId);
            for (const assignment of assignments || []) {
                room.assignPlayer(assignment);
            }
        } catch (_error) {
            return { ok: false, code: LobbyErrorCode.INVALID_REQUEST };
        }

        return { ok: true, room };
    }

    leaveClient(clientId, { allowReconnect = false } = {}) {
        const room = this.findByClientId(clientId);
        if (!room) {
            return null;
        }

        if (clientId === room.hostClientId) {
            room.close("HOST_DISCONNECTED");
            this.#removeRoom(room);
            return { room, closed: true, reasonCode: "HOST_DISCONNECTED" };
        }

        if (allowReconnect && room.status === LobbyRoomStatus.ACTIVE) {
            const member = room.markGuestReconnecting(clientId);
            this.roomIdsByConnectionId.delete(clientId);
            return {
                room,
                member,
                closed: false,
                reconnecting: true,
                reasonCode: "GUEST_RECONNECTING"
            };
        }

        this.roomIdsByConnectionId.delete(clientId);
        const member = room.markGuestLeft(clientId);
        if (room.status === LobbyRoomStatus.CLOSED) {
            this.#removeRoom(room);
            return {
                room,
                member,
                closed: true,
                reasonCode: room.closeReasonCode || "PLAYER_LEFT_ACTIVE_SESSION"
            };
        }

        return {
            room,
            member,
            closed: false,
            reconnecting: false,
            reasonCode: "GUEST_LEFT"
        };
    }

    reconnectGuest({ room, guestId, connectionId }) {
        if (this.roomIdsByConnectionId.has(connectionId)) {
            return { ok: false, code: LobbyErrorCode.ALREADY_IN_ROOM };
        }

        const member = room.markGuestResumed({ guestId, connectionId });
        if (!member) {
            return { ok: false, code: LobbyErrorCode.INVALID_REQUEST };
        }

        this.roomIdsByConnectionId.set(connectionId, room.roomId);
        return { ok: true, room, member };
    }

    closeRoom(roomId, reasonCode = "ROOM_CLOSED") {
        const room = this.roomsById.get(roomId);
        if (!room) {
            return null;
        }

        room.close(reasonCode);
        this.#removeRoom(room);
        return room;
    }

    clear() {
        this.roomsById.clear();
        this.roomIdsByCode.clear();
        this.roomIdsByConnectionId.clear();
    }

    #validatePublicAssignments(room, assignments) {
        if (assignments === null) {
            return [];
        }
        if (!Array.isArray(assignments)) {
            return null;
        }

        const members = room.getOrderedActiveMembers();
        if (assignments.length !== members.length) {
            return null;
        }

        const assignmentsByGuestId = new Map();
        const playerIds = new Set();
        for (const assignment of assignments) {
            const guestId = assignment?.guestId;
            const playerId = assignment?.playerId;
            if (
                typeof guestId !== "string" ||
                guestId.length === 0 ||
                typeof playerId !== "string" ||
                playerId.length === 0 ||
                assignmentsByGuestId.has(guestId) ||
                playerIds.has(playerId)
            ) {
                return null;
            }

            assignmentsByGuestId.set(guestId, {
                guestId,
                playerId,
                publicPlayerName: typeof assignment.publicPlayerName === "string"
                    ? assignment.publicPlayerName
                    : null,
                publicCharacterName: typeof assignment.publicCharacterName === "string"
                    ? assignment.publicCharacterName
                    : null
            });
            playerIds.add(playerId);
        }

        if (members.some(member => !assignmentsByGuestId.has(member.guestId))) {
            return null;
        }

        return members.map(member => assignmentsByGuestId.get(member.guestId));
    }

    #removeRoom(room) {
        this.roomsById.delete(room.roomId);
        this.roomIdsByCode.delete(room.roomCode);
        this.roomIdsByConnectionId.delete(room.hostClientId);
        for (const member of room.getOrderedActiveMembers()) {
            if (member.currentConnectionId) {
                this.roomIdsByConnectionId.delete(member.currentConnectionId);
            }
        }
    }
}
