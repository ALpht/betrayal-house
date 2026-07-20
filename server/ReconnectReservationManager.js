import {
    LobbyErrorCode,
    LobbyRoomStatus
} from "./ServerMessageType.js";

function createToken() {
    return crypto.randomUUID();
}

function createScheduler() {
    return {
        schedule(callback, delay) {
            return setTimeout(callback, delay);
        },
        cancel(handle) {
            clearTimeout(handle);
        },
        now() {
            return Date.now();
        }
    };
}

export class ReconnectReservationManager {
    constructor({
        registry,
        reconnectGraceMs = 30000,
        scheduler = createScheduler(),
        tokenFactory = createToken,
        onExpired = () => {}
    }) {
        this.registry = registry;
        this.reconnectGraceMs = reconnectGraceMs;
        this.scheduler = scheduler;
        this.tokenFactory = tokenFactory;
        this.onExpired = onExpired;
        this.reservationsByToken = new Map();
        this.tokensByClientId = new Map();
        this.timersByRoomId = new Map();
        this.generationByRoomId = new Map();
    }

    issueToken({ clientId, roomId, role, sessionId = null }) {
        const resumeToken = this.tokenFactory();
        const reservation = {
            clientId,
            roomId,
            role,
            sessionId,
            expiresAt: null,
            generation: this.#nextGeneration(roomId)
        };
        this.#store(resumeToken, reservation);
        return resumeToken;
    }

    updateSession({ clientId, sessionId }) {
        const token = this.tokensByClientId.get(clientId);
        const reservation = token ? this.reservationsByToken.get(token) : null;
        if (reservation) {
            reservation.sessionId = sessionId;
        }
    }

    reserveDisconnectedGuest({ room, clientId }) {
        const token = this.tokensByClientId.get(clientId);
        const reservation = token ? this.reservationsByToken.get(token) : null;
        if (!reservation) {
            return null;
        }

        reservation.expiresAt = this.scheduler.now() + this.reconnectGraceMs;
        reservation.generation = this.#nextGeneration(room.roomId);
        const generation = reservation.generation;
        this.#clearTimer(room.roomId);
        const timer = this.scheduler.schedule(() => {
            this.#expireIfCurrent(room.roomId, generation);
        }, this.reconnectGraceMs);
        this.timersByRoomId.set(room.roomId, timer);
        return structuredClone(reservation);
    }

    claimResume({ roomCode, resumeToken, now = this.scheduler.now() }) {
        const reservation = this.reservationsByToken.get(resumeToken);
        if (!reservation) {
            return { accepted: false, reasonCode: LobbyErrorCode.INVALID_TOKEN };
        }

        if (reservation.expiresAt !== null && now >= reservation.expiresAt) {
            this.invalidateToken(resumeToken);
            return { accepted: false, reasonCode: LobbyErrorCode.TOKEN_EXPIRED };
        }

        const room = this.registry.findByCode(roomCode);
        if (!room || room.roomId !== reservation.roomId) {
            return { accepted: false, reasonCode: LobbyErrorCode.ROOM_NOT_FOUND };
        }

        if (room.status === LobbyRoomStatus.ACTIVE) {
            return { accepted: false, reasonCode: LobbyErrorCode.ALREADY_CONNECTED };
        }

        if (room.status !== LobbyRoomStatus.RECONNECTING) {
            return { accepted: false, reasonCode: LobbyErrorCode.ROOM_NOT_RECONNECTING };
        }

        this.#clearTimer(room.roomId);
        this.invalidateToken(resumeToken);
        room.markGuestResumed();
        const rotatedToken = this.issueToken({
            clientId: reservation.clientId,
            roomId: reservation.roomId,
            role: reservation.role,
            sessionId: reservation.sessionId
        });

        return {
            accepted: true,
            reasonCode: null,
            clientId: reservation.clientId,
            roomId: reservation.roomId,
            sessionId: reservation.sessionId,
            role: reservation.role,
            rotatedToken,
            room
        };
    }

    invalidateToken(resumeToken) {
        const reservation = this.reservationsByToken.get(resumeToken);
        if (!reservation) {
            return;
        }

        this.reservationsByToken.delete(resumeToken);
        if (this.tokensByClientId.get(reservation.clientId) === resumeToken) {
            this.tokensByClientId.delete(reservation.clientId);
        }
    }

    clear() {
        for (const timer of this.timersByRoomId.values()) {
            this.scheduler.cancel(timer);
        }
        this.timersByRoomId.clear();
        this.reservationsByToken.clear();
        this.tokensByClientId.clear();
        this.generationByRoomId.clear();
    }

    #store(token, reservation) {
        const oldToken = this.tokensByClientId.get(reservation.clientId);
        if (oldToken) {
            this.reservationsByToken.delete(oldToken);
        }
        this.tokensByClientId.set(reservation.clientId, token);
        this.reservationsByToken.set(token, reservation);
    }

    #nextGeneration(roomId) {
        const generation = (this.generationByRoomId.get(roomId) || 0) + 1;
        this.generationByRoomId.set(roomId, generation);
        return generation;
    }

    #clearTimer(roomId) {
        const timer = this.timersByRoomId.get(roomId);
        if (timer) {
            this.scheduler.cancel(timer);
            this.timersByRoomId.delete(roomId);
        }
    }

    #expireIfCurrent(roomId, generation) {
        if (this.generationByRoomId.get(roomId) !== generation) {
            return;
        }

        const room = this.registry.roomsById.get(roomId);
        if (!room || room.status !== LobbyRoomStatus.RECONNECTING) {
            return;
        }

        this.#clearTimer(roomId);
        this.onExpired({ room, generation });
    }
}
