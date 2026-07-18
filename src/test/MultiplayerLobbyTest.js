import { LobbyRegistry } from "../../server/LobbyRegistry.js";
import { LobbyRoom } from "../../server/LobbyRoom.js";
import { RoomCodeGenerator } from "../../server/RoomCodeGenerator.js";
import {
    LobbyErrorCode,
    LobbyRoomStatus
} from "../../server/ServerMessageType.js";

export function runMultiplayerLobbyTest() {
    console.log("\n===== Multiplayer Lobby Test =====");
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
        let ids = 0;
        const registry = new LobbyRegistry({
            idFactory: prefix => `${prefix}-${++ids}`,
            roomCodeGenerator: new RoomCodeGenerator({ random: () => 0 })
        });
        const created = registry.createRoom("host-client");

        assert(
            created.ok &&
                created.room.roomId === "room-1" &&
                created.room.roomCode === "AAAA" &&
                created.room.status === LobbyRoomStatus.WAITING,
            "Case 1: Host creates waiting room with roomId and roomCode"
        );
        assert(
            registry.findByCode("AAAA") === created.room &&
                registry.findByClientId("host-client") === created.room,
            "Case 2: Registry indexes room by code and client membership"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Cases 1-2 threw", e.message);
    }

    try {
        const sequence = [0, 0, 0, 0, 0, 0, 0, 0, 0.04, 0.04, 0.04, 0.04];
        const registry = new LobbyRegistry({
            idFactory: prefix => `${prefix}-${crypto.randomUUID()}`,
            roomCodeGenerator: new RoomCodeGenerator({
                random: () => sequence.shift() ?? 0.04
            })
        });
        const first = registry.createRoom("host-a");
        const second = registry.createRoom("host-b");

        assert(
            first.room.roomCode === "AAAA" &&
                second.room.roomCode === "BBBB",
            "Case 3: Room code generator retries collisions"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 3 threw", e.message);
    }

    try {
        const registry = new LobbyRegistry({
            idFactory: prefix => `${prefix}-${crypto.randomUUID()}`,
            roomCodeGenerator: new RoomCodeGenerator({ random: () => 0 })
        });
        const room = registry.createRoom("host").room;
        const joined = registry.joinRoom({
            roomCode: room.roomCode,
            guestClientId: "guest"
        });
        const full = registry.joinRoom({
            roomCode: room.roomCode,
            guestClientId: "late-guest"
        });
        const duplicate = registry.createRoom("guest");

        assert(
            joined.ok &&
                room.status === LobbyRoomStatus.READY &&
                room.guestClientId === "guest",
            "Case 4: Guest join marks room READY"
        );
        assert(
            full.code === LobbyErrorCode.ROOM_FULL &&
                duplicate.code === LobbyErrorCode.ALREADY_IN_ROOM,
            "Case 5: Room full and one-client/one-room are enforced"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Cases 4-5 threw", e.message);
    }

    try {
        const registry = new LobbyRegistry();
        const missing = registry.joinRoom({
            roomCode: "NOPE",
            guestClientId: "guest"
        });

        assert(
            missing.code === LobbyErrorCode.ROOM_NOT_FOUND,
            "Case 6: Invalid room code is rejected"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 6 threw", e.message);
    }

    try {
        const room = new LobbyRoom({
            roomId: "room-1",
            roomCode: "ABCD",
            hostClientId: "host"
        });
        room.markGuestJoined("guest");
        room.activate("session-1");
        let activeToReadyRejected = false;
        try {
            room.markGuestLeft();
        } catch (_error) {
            activeToReadyRejected = true;
        }

        assert(
            room.status === LobbyRoomStatus.CLOSED &&
                activeToReadyRejected === false,
            "Case 7: ACTIVE guest leave closes room instead of returning READY"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 7 threw", e.message);
    }

    try {
        const room = new LobbyRoom({
            roomId: "same-id",
            roomCode: "ABCD",
            hostClientId: "host"
        });
        room.markGuestJoined("guest");
        let rejected = false;
        try {
            room.activate("same-id");
        } catch (_error) {
            rejected = true;
        }

        assert(
            rejected,
            "Case 8: roomId and sessionId must remain distinct"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 8 threw", e.message);
    }

    try {
        const registry = new LobbyRegistry();
        const room = registry.createRoom("host").room;
        registry.joinRoom({ roomCode: room.roomCode, guestClientId: "guest" });
        const left = registry.leaveClient("guest");

        assert(
            left.closed === false &&
                room.status === LobbyRoomStatus.WAITING &&
                room.guestClientId === null,
            "Case 9: READY guest disconnect returns room to WAITING"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 9 threw", e.message);
    }

    console.log(`===== Multiplayer Lobby Test: ${passed} passed, ${failed} failed =====\n`);
}
