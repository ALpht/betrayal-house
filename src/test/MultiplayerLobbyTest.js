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
                created.room.status === LobbyRoomStatus.WAITING_FOR_PLAYERS,
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
            guestClientId: "guest",
            displayName: "Guest"
        });
        const full = registry.joinRoom({
            roomCode: room.roomCode,
            guestClientId: "late-guest",
            displayName: "Late Guest"
        });
        const duplicate = registry.createRoom("guest");

        assert(
            joined.ok &&
                room.status === LobbyRoomStatus.WAITING_FOR_PLAYERS &&
                room.getOrderedActiveMembers().some(member => member.displayName === "Guest"),
            "Case 4: Guest join adds roster member without stored READY state"
        );
        assert(
            full.ok === true &&
                duplicate.code === LobbyErrorCode.ALREADY_IN_ROOM,
            "Case 5: Default 2-player room accepts second Guest and one-client/one-room is enforced"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Cases 4-5 threw", e.message);
    }

    try {
        const registry = new LobbyRegistry();
        const missing = registry.joinRoom({
            roomCode: "NOPE",
            guestClientId: "guest",
            displayName: "Guest"
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
        room.addGuest({ connectionId: "guest-a", displayName: "A" });
        room.addGuest({ connectionId: "guest-b", displayName: "B" });
        room.markReady("guest-a", true);
        room.markReady("guest-b", true);
        room.activate("session-1");
        const left = room.markGuestLeft("guest-a");

        assert(
            room.status === LobbyRoomStatus.CLOSED &&
                left.membershipState === "LEFT" &&
                room.closeReasonCode === "PLAYER_LEFT_ACTIVE_SESSION",
            "Case 7: ACTIVE guest leave closes room with terminal reason"
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
        room.addGuest({ connectionId: "guest-a", displayName: "A" });
        room.addGuest({ connectionId: "guest-b", displayName: "B" });
        room.markReady("guest-a", true);
        room.markReady("guest-b", true);
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
        registry.joinRoom({ roomCode: room.roomCode, guestClientId: "guest", displayName: "Guest" });
        const left = registry.leaveClient("guest");

        assert(
            left.closed === false &&
                room.status === LobbyRoomStatus.WAITING_FOR_PLAYERS &&
                room.getOrderedActiveMembers().length === 0,
            "Case 9: Waiting-room guest disconnect removes roster member"
        );
    } catch (e) {
        failed++;
        console.log("[FAIL] Case 9 threw", e.message);
    }

    console.log(`===== Multiplayer Lobby Test: ${passed} passed, ${failed} failed =====\n`);
}
