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
        const room = registry.createRoom("host").room;
        registry.joinRoom({ roomCode: room.roomCode, guestClientId: "guest" });
        room.activate("session-1");
        const token = manager.issueToken({
            clientId: "guest",
            roomId: room.roomId,
            role: LobbyRole.GUEST,
            sessionId: room.sessionId
        });
        const left = registry.leaveClient("guest", { allowReconnect: true });
        const reservation = manager.reserveDisconnectedGuest({
            room,
            clientId: "guest"
        });

        assert(
            left.reconnecting === true &&
                room.status === LobbyRoomStatus.RECONNECTING &&
                scheduler.activeCount() === 1 &&
                reservation.expiresAt === 1050,
            "Case 1: Active guest disconnect moves room to RECONNECTING and starts one timer"
        );

        const claim = manager.claimResume({
            roomCode: room.roomCode,
            resumeToken: token
        });

        assert(
            claim.accepted === true &&
                claim.clientId === "guest" &&
                claim.sessionId === "session-1" &&
                claim.rotatedToken === "token-2" &&
                room.status === LobbyRoomStatus.ACTIVE,
            "Case 2: Valid resume atomically restores identity, session, room, and rotated token"
        );

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
        const room = registry.createRoom("host").room;
        registry.joinRoom({ roomCode: room.roomCode, guestClientId: "guest" });
        room.activate("session-2");
        const token = manager.issueToken({
            clientId: "guest",
            roomId: room.roomId,
            role: LobbyRole.GUEST,
            sessionId: room.sessionId
        });
        registry.leaveClient("guest", { allowReconnect: true });
        manager.reserveDisconnectedGuest({ room, clientId: "guest" });
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

    console.log(`===== Multiplayer Reconnect Test: ${passed} passed, ${failed} failed =====\n`);
}
