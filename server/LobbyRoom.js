import {
    LobbyRole,
    LobbyRoomStatus
} from "./ServerMessageType.js";

export class LobbyRoom {
    constructor({
        roomId,
        roomCode,
        hostClientId
    }) {
        this.roomId = roomId;
        this.roomCode = roomCode;
        this.hostClientId = hostClientId;
        this.guestClientId = null;
        this.sessionId = null;
        this.status = LobbyRoomStatus.WAITING;
        this.closeReasonCode = null;
    }

    markGuestJoined(guestClientId) {
        if (this.status !== LobbyRoomStatus.WAITING) {
            throw new Error("Room is not waiting for guest");
        }

        if (this.guestClientId) {
            throw new Error("Room already has a guest");
        }

        this.guestClientId = guestClientId;
        this.status = LobbyRoomStatus.READY;
    }

    markGuestLeft() {
        if (this.status === LobbyRoomStatus.READY) {
            this.guestClientId = null;
            this.status = LobbyRoomStatus.WAITING;
            return;
        }

        if (this.status === LobbyRoomStatus.ACTIVE) {
            this.close("GUEST_DISCONNECTED");
        }
    }

    markGuestReconnecting() {
        if (this.status !== LobbyRoomStatus.ACTIVE) {
            throw new Error("Room must be ACTIVE before reconnecting");
        }

        this.status = LobbyRoomStatus.RECONNECTING;
    }

    markGuestResumed() {
        if (this.status !== LobbyRoomStatus.RECONNECTING) {
            throw new Error("Room must be RECONNECTING before resume");
        }

        this.status = LobbyRoomStatus.ACTIVE;
    }

    activate(sessionId) {
        if (this.status !== LobbyRoomStatus.READY) {
            throw new Error("Room must be READY before activation");
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

        if (clientId === this.guestClientId) {
            return LobbyRole.GUEST;
        }

        return null;
    }

    getPeerClientId(clientId) {
        if (clientId === this.hostClientId) {
            return this.guestClientId;
        }

        if (clientId === this.guestClientId) {
            return this.hostClientId;
        }

        return null;
    }

    toJSON() {
        return {
            roomId: this.roomId,
            roomCode: this.roomCode,
            hostClientId: this.hostClientId,
            guestClientId: this.guestClientId,
            sessionId: this.sessionId,
            status: this.status
        };
    }
}
