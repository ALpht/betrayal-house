import { LobbyRegistry } from "../../server/LobbyRegistry.js";
import { ReconnectReservationManager } from "../../server/ReconnectReservationManager.js";
import {
    LobbyErrorCode,
    LobbyRole,
    LobbyRoomStatus
} from "../../server/ServerMessageType.js";

function createScheduler(start = 1000) {
    let current = start;
    const handles = new Map();
    let nextHandle = 1;
    return {
        schedule(callback, delay) {
            const handle = nextHandle++;
            handles.set(handle, {
                callback,
                at: current + delay,
                cancelled: false
            });
            return handle;
        },
        cancel(handle) {
            const entry = handles.get(handle);
            if (entry) {
                entry.cancelled = true;
            }
        },
        now() {
            return current;
        },
        advance(ms) {
            current += ms;
            for (const [handle, entry] of [...handles]) {
                if (!entry.cancelled && entry.at <= current) {
                    handles.delete(handle);
                    entry.callback();
                }
            }
        },
        activeCount() {
            return [...handles.values()].filter(entry => !entry.cancelled).length;
        }
    };
}

function createActiveRoom(registry, sessionId) {
    const room = registry.createRoom("host").room;
    registry.joinRoom({ roomCode: room.roomCode, guestClientId: "guest-a", displayName: "A" });
    registry.joinRoom({ roomCode: room.roomCode, guestClientId: "guest-b", displayName: "B" });
    registry.setReady({ clientId: "guest-a", ready: true });
    registry.setReady({ clientId: "guest-b", ready: true });
    room.activate(sessionId);
    return room;
}

export function runMultiplayerReconnectTest() {
    console.log("\n===== Multiplayer Reconnect Test =====");
    let passed = 0;
    let failed = 0;

    const assert = (ok, label) => {
        if (ok) {
            passed++;
            console.log(`[PASS] ${label}`);
        } else {
            failed++;
            console.log(`[FAIL] ${label}`);
        }
    };

    try {
        const registry = new LobbyRegistry({
            idFactory: prefix => `${prefix}-1`
        });
        const scheduler = createScheduler();
        let expiredRoom = null;
        const manager = new ReconnectReservationManager({
            registry,
            reconnectGraceMs: 50,
            scheduler,
            tokenFactory: (() => {
                let count = 0;
                return () => `token-${++count}`;
            })(),
            onExpired: ({ room }) => {
                room.close("RECONNECT_TIMEOUT");
                expiredRoom = room;
            }
        });
        const room = createActiveRoom(registry, "session-1");
        const member = room.getMemberByConnectionId("guest-a");
        const token = manager.issueToken({
            clientId: "guest-a",
            guestId: member.guestId,
            roomId: room.roomId,
            role: LobbyRole.GUEST,
            sessionId: room.sessionId
        });
        const left = registry.leaveClient("guest-a", { allowReconnect: true });
        const reservation = manager.reserveDisconnectedGuest({
            room,
            clientId: "guest-a",
            guestId: member.guestId
        });

        assert(
            left.reconnecting === true &&
                room.status === LobbyRoomStatus.ACTIVE &&
                room.getMemberByGuestId(member.guestId).connectionState === "RECONNECTING" &&
                scheduler.activeCount() === 1 &&
                reservation.expiresAt === 1050,
            "Case 1: Active guest disconnect marks member RECONNECTING and starts one timer"
        );

        const claim = manager.claimResume({
            roomCode: room.roomCode,
            resumeToken: token
        });

        assert(
            claim.accepted === true &&
                claim.clientId === "guest-a" &&
                claim.guestId === member.guestId &&
                claim.sessionId === "session-1" &&
                claim.rotatedToken === "token-2" &&
                room.status === LobbyRoomStatus.ACTIVE,
            "Case 2: Valid resume preserves guest identity, session, room, and rotated token"
        );
        room.markGuestResumed({
            guestId: member.guestId,
            connectionId: "guest-a-resumed"
        });

        const oldToken = manager.claimResume({
            roomCode: room.roomCode,
            resumeToken: token
        });

        assert(
            oldToken.reasonCode === LobbyErrorCode.INVALID_TOKEN,
            "Case 3: Old token cannot be reused after rotation"
        );

        scheduler.advance(100);
        assert(
            expiredRoom === null && room.status === LobbyRoomStatus.ACTIVE,
            "Case 4: Stale timer callback after successful resume is a no-op"
        );

        const duplicate = manager.claimResume({
            roomCode: room.roomCode,
            resumeToken: claim.rotatedToken
        });
        assert(
            duplicate.reasonCode === LobbyErrorCode.ALREADY_CONNECTED,
            "Case 5: Duplicate active resume is rejected"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Reconnect cases threw", e.message);
    }

    try {
        const registry = new LobbyRegistry({
            idFactory: prefix => `${prefix}-2`
        });
        const scheduler = createScheduler();
        const manager = new ReconnectReservationManager({
            registry,
            reconnectGraceMs: 50,
            scheduler,
            tokenFactory: (() => {
                let count = 0;
                return () => `expire-token-${++count}`;
            })()
        });
        const room = createActiveRoom(registry, "session-2");
        const member = room.getMemberByConnectionId("guest-a");
        const token = manager.issueToken({
            clientId: "guest-a",
            guestId: member.guestId,
            roomId: room.roomId,
            role: LobbyRole.GUEST,
            sessionId: room.sessionId
        });
        registry.leaveClient("guest-a", { allowReconnect: true });
        manager.reserveDisconnectedGuest({
            room,
            clientId: "guest-a",
            guestId: member.guestId
        });
        scheduler.advance(51);
        const claim = manager.claimResume({
            roomCode: room.roomCode,
            resumeToken: token
        });

        assert(
            claim.reasonCode === LobbyErrorCode.TOKEN_EXPIRED ||
                room.status === LobbyRoomStatus.CLOSED,
            "Case 6: Expired token cannot resume after grace"
        );
        manager.clear();
        assert(
            scheduler.activeCount() === 0,
            "Case 7: Reservation manager clear cancels timers"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Expiry cases threw", e.message);
    }

    try {
        const registry = new LobbyRegistry({
            idFactory: prefix => `${prefix}-3`
        });
        const scheduler = createScheduler();
        const expiredGuests = [];
        const manager = new ReconnectReservationManager({
            registry,
            reconnectGraceMs: 50,
            scheduler,
            tokenFactory: (() => {
                let count = 0;
                return () => `multi-token-${++count}`;
            })(),
            onExpired: ({ guestId }) => {
                expiredGuests.push(guestId);
            }
        });
        const room = createActiveRoom(registry, "session-3");
        const memberA = room.getMemberByConnectionId("guest-a");
        const memberB = room.getMemberByConnectionId("guest-b");

        manager.issueToken({
            clientId: "guest-a",
            guestId: memberA.guestId,
            roomId: room.roomId,
            role: LobbyRole.GUEST,
            sessionId: room.sessionId
        });
        manager.issueToken({
            clientId: "guest-b",
            guestId: memberB.guestId,
            roomId: room.roomId,
            role: LobbyRole.GUEST,
            sessionId: room.sessionId
        });
        registry.leaveClient("guest-a", { allowReconnect: true });
        registry.leaveClient("guest-b", { allowReconnect: true });
        manager.reserveDisconnectedGuest({
            room,
            clientId: "guest-a",
            guestId: memberA.guestId
        });
        manager.reserveDisconnectedGuest({
            room,
            clientId: "guest-b",
            guestId: memberB.guestId
        });
        scheduler.advance(51);

        assert(
            expiredGuests.includes(memberA.guestId) &&
                expiredGuests.includes(memberB.guestId) &&
                expiredGuests.length === 2,
            "Case 8: Multiple Guest reconnect timers expire independently"
        );
        manager.clear();
    } catch (e) {
        failed++;
        console.log("[FAIL] Multi-Guest reconnect cases threw", e.message);
    }

    console.log(`===== Multiplayer Reconnect Test: ${passed} passed, ${failed} failed =====\n`);
}
