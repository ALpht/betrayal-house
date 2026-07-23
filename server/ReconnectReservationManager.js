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
        this.generationByReservationKey = new Map();
    }

    issueToken({ clientId, guestId = clientId, roomId, role, sessionId = null }) {
        const resumeToken = this.tokenFactory();
        const reservation = {
            clientId,
            guestId,
            roomId,
            role,
            sessionId,
            expiresAt: null,
            generation: this.#nextGeneration(roomId, guestId)
        };
        this.#store(resumeToken, reservation);
        return resumeToken;
    }

    updateSession({ clientId, guestId = clientId, sessionId }) {
        const token = this.tokensByClientId.get(guestId) || this.tokensByClientId.get(clientId);
        const reservation = token ? this.reservationsByToken.get(token) : null;
        if (reservation) {
            reservation.sessionId = sessionId;
        }
    }

    reserveDisconnectedGuest({ room, clientId, guestId = clientId }) {
        const token = this.tokensByClientId.get(guestId) || this.tokensByClientId.get(clientId);
        const reservation = token ? this.reservationsByToken.get(token) : null;
        if (!reservation) {
            return null;
        }

        reservation.expiresAt = this.scheduler.now() + this.reconnectGraceMs;
        reservation.generation = this.#nextGeneration(room.roomId, reservation.guestId);
        const generation = reservation.generation;
        this.#clearTimer(room.roomId, reservation.guestId);
        const timer = this.scheduler.schedule(() => {
            this.#expireIfCurrent(room.roomId, reservation.guestId, generation);
        }, this.reconnectGraceMs);
        this.timersByRoomId.set(`${room.roomId}:${reservation.guestId}`, timer);
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

        if (room.status !== LobbyRoomStatus.ACTIVE) {
            return { accepted: false, reasonCode: LobbyErrorCode.ROOM_NOT_RECONNECTING };
        }

        const member = room.getMemberByGuestId?.(reservation.guestId);
        if (!member || member.connectionState !== "RECONNECTING") {
            return { accepted: false, reasonCode: LobbyErrorCode.ALREADY_CONNECTED };
        }

        this.#clearTimer(room.roomId, reservation.guestId);
        this.invalidateToken(resumeToken);
        const rotatedToken = this.issueToken({
            clientId: reservation.clientId,
            guestId: reservation.guestId,
            roomId: reservation.roomId,
            role: reservation.role,
            sessionId: reservation.sessionId
        });

        return {
            accepted: true,
            reasonCode: null,
            clientId: reservation.clientId,
            guestId: reservation.guestId,
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
        if (this.tokensByClientId.get(reservation.guestId) === resumeToken) {
            this.tokensByClientId.delete(reservation.guestId);
        }
    }

    clear() {
        for (const timer of this.timersByRoomId.values()) {
            this.scheduler.cancel(timer);
        }
        this.timersByRoomId.clear();
        this.reservationsByToken.clear();
        this.tokensByClientId.clear();
        this.generationByReservationKey.clear();
    }

    #store(token, reservation) {
        const oldToken = this.tokensByClientId.get(reservation.guestId);
        if (oldToken) {
            this.reservationsByToken.delete(oldToken);
        }
        this.tokensByClientId.set(reservation.guestId, token);
        this.reservationsByToken.set(token, reservation);
    }

    #nextGeneration(roomId, guestId) {
        const key = `${roomId}:${guestId}`;
        const generation = (this.generationByReservationKey.get(key) || 0) + 1;
        this.generationByReservationKey.set(key, generation);
        return generation;
    }

    #clearTimer(roomId, guestId = null) {
        const key = guestId ? `${roomId}:${guestId}` : roomId;
        const timer = this.timersByRoomId.get(key);
        if (timer) {
            this.scheduler.cancel(timer);
            this.timersByRoomId.delete(key);
        }
    }

    #expireIfCurrent(roomId, guestId, generation) {
        if (this.generationByReservationKey.get(`${roomId}:${guestId}`) !== generation) {
            return;
        }

        const room = this.registry.roomsById.get(roomId);
        if (!room || room.status !== LobbyRoomStatus.ACTIVE) {
            return;
        }

        this.#clearTimer(roomId, guestId);
        this.onExpired({ room, guestId, generation });
    }
}
