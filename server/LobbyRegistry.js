import { LobbyRoom } from "./LobbyRoom.js";
import {
    LobbyErrorCode,
    LobbyRoomStatus
} from "./ServerMessageType.js";
import { RoomCodeGenerator } from "./RoomCodeGenerator.js";

function createId(prefix) {
    return `${prefix}-${crypto.randomUUID()}`;
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
        this.roomIdsByClientId = new Map();
    }

    createRoom(hostClientId) {
        if (this.roomIdsByClientId.has(hostClientId)) {
            return { ok: false, code: LobbyErrorCode.ALREADY_IN_ROOM };
        }

        const existingCodes = new Set(this.roomIdsByCode.keys());
        const roomCode = this.roomCodeGenerator.generate(existingCodes);
        const room = new LobbyRoom({
            roomId: this.idFactory("room"),
            roomCode,
            hostClientId
        });

        this.roomsById.set(room.roomId, room);
        this.roomIdsByCode.set(room.roomCode, room.roomId);
        this.roomIdsByClientId.set(hostClientId, room.roomId);

        return { ok: true, room };
    }

    findByCode(roomCode) {
        const roomId = this.roomIdsByCode.get(roomCode);
        return roomId ? this.roomsById.get(roomId) || null : null;
    }

    findByClientId(clientId) {
        const roomId = this.roomIdsByClientId.get(clientId);
        return roomId ? this.roomsById.get(roomId) || null : null;
    }

    joinRoom({ roomCode, guestClientId }) {
        if (this.roomIdsByClientId.has(guestClientId)) {
            return { ok: false, code: LobbyErrorCode.ALREADY_IN_ROOM };
        }

        const room = this.findByCode(roomCode);
        if (!room) {
            return { ok: false, code: LobbyErrorCode.ROOM_NOT_FOUND };
        }

        if (room.status === LobbyRoomStatus.CLOSED) {
            return { ok: false, code: LobbyErrorCode.ROOM_CLOSED };
        }

        if (room.status !== LobbyRoomStatus.WAITING || room.guestClientId) {
            return { ok: false, code: LobbyErrorCode.ROOM_FULL };
        }

        room.markGuestJoined(guestClientId);
        this.roomIdsByClientId.set(guestClientId, room.roomId);
        return { ok: true, room };
    }

    activateRoom({ hostClientId, sessionId }) {
        const room = this.findByClientId(hostClientId);
        if (!room || room.hostClientId !== hostClientId) {
            return { ok: false, code: LobbyErrorCode.NOT_HOST };
        }

        if (room.status === LobbyRoomStatus.ACTIVE) {
            return { ok: false, code: LobbyErrorCode.SESSION_ALREADY_STARTED };
        }

        try {
            room.activate(sessionId);
        } catch (_error) {
            return { ok: false, code: LobbyErrorCode.INVALID_REQUEST };
        }

        return { ok: true, room };
    }

    leaveClient(clientId) {
        const room = this.findByClientId(clientId);
        if (!room) {
            return null;
        }

        if (clientId === room.hostClientId) {
            room.close("HOST_DISCONNECTED");
            this.#removeRoom(room);
            return { room, closed: true, reasonCode: "HOST_DISCONNECTED" };
        }

        this.roomIdsByClientId.delete(clientId);
        room.markGuestLeft();

        if (room.status === LobbyRoomStatus.CLOSED) {
            this.#removeRoom(room);
            return { room, closed: true, reasonCode: "GUEST_DISCONNECTED" };
        }

        return { room, closed: false, reasonCode: "GUEST_DISCONNECTED" };
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
        this.roomIdsByClientId.clear();
    }

    #removeRoom(room) {
        this.roomsById.delete(room.roomId);
        this.roomIdsByCode.delete(room.roomCode);
        this.roomIdsByClientId.delete(room.hostClientId);
        if (room.guestClientId) {
            this.roomIdsByClientId.delete(room.guestClientId);
        }
    }
}
