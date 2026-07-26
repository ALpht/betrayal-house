import { LobbyRegistry } from "../../server/LobbyRegistry.js";
import { MultiplayerRoomRoster } from "../../server/MultiplayerRoomRoster.js";
import { LobbyErrorCode } from "../../server/ServerMessageType.js";

function createRegistry() {
    let id = 1;
    return new LobbyRegistry({
        roomCodeGenerator: { generate: () => `ROOM${id++}` },
        idFactory: prefix => `${prefix}-${id++}`
    });
}

export function runMultiGuestLobbyTest() {
    console.log("\n===== Multi-Guest Lobby Test =====");
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

    const registry = createRegistry();
    const created = registry.createRoom("host-1", { playerCount: 3 });
    const roomCode = created.room.roomCode;
    const a = registry.joinRoom({ roomCode, guestClientId: "conn-a", displayName: "A" });
    const b = registry.joinRoom({ roomCode, guestClientId: "conn-b", displayName: "B" });
    const c = registry.joinRoom({ roomCode, guestClientId: "conn-c", displayName: "C" });
    const d = registry.joinRoom({ roomCode, guestClientId: "conn-d", displayName: "D" });

    assert(created.ok && created.room.playerCount === 3, "Case 1: Host creates fixed 3-player room");
    assert(a.ok && b.ok && c.ok, "Case 2: Three Guests join one room");
    assert(d.ok === false && d.code === LobbyErrorCode.ROOM_FULL, "Case 3: Fourth Guest rejected with ROOM_FULL");
    assert(
        created.room.getOrderedActiveMembers().map(member => member.displayName).join(",") === "A,B,C",
        "Case 4: Roster preserves stable join order"
    );

    assert(
        created.room.getStartEligibility().canStart === true,
        "Case 5: Start enables automatically when the exact roster is connected"
    );
    assert(
        new Set(created.room.getOrderedActiveMembers()
            .map(member => member.publicCharacterId)).size === 3 &&
            created.room.getOrderedActiveMembers().every(member =>
                member.publicCharacterName
            ),
        "Case 6: Room immediately assigns unique randomized characters"
    );

    let randomGuestId = 0;
    const randomizedRoster = new MultiplayerRoomRoster({
        guestIdFactory: () => `random-guest-${++randomGuestId}`,
        random: () => 0
    });
    const randomizedFirst = randomizedRoster.addGuest({
        connectionId: "random-a",
        displayName: "A"
    });
    const randomizedSecond = randomizedRoster.addGuest({
        connectionId: "random-b",
        displayName: "B"
    });
    assert(
        randomizedFirst.publicCharacterId === "ox" &&
            randomizedSecond.publicCharacterId === "professor" &&
            randomizedFirst.publicCharacterId !== randomizedSecond.publicCharacterId,
        "Case 6a: Assignment is shuffled instead of fixed Brandon then Ox"
    );

    const disconnected = registry.leaveClient("conn-b", { allowReconnect: true });
    assert(
        disconnected.reconnecting === false && created.room.getOrderedActiveMembers().length === 2,
        "Case 7: Waiting-room leave removes member and frees capacity"
    );

    const assignmentRegistry = createRegistry();
    const assignmentRoom = assignmentRegistry.createRoom("host-2", { playerCount: 2 }).room;
    const assignmentA = assignmentRegistry.joinRoom({
        roomCode: assignmentRoom.roomCode,
        guestClientId: "assign-a",
        displayName: "A"
    });
    const assignmentB = assignmentRegistry.joinRoom({
        roomCode: assignmentRoom.roomCode,
        guestClientId: "assign-b",
        displayName: "B"
    });
    const activated = assignmentRegistry.activateRoom({
        hostClientId: "host-2",
        sessionId: "session-assignments",
        publicAssignments: [
            {
                guestId: assignmentA.member.guestId,
                playerId: "player-a",
                publicPlayerName: "A",
                publicCharacterName: "Brandon"
            },
            {
                guestId: assignmentB.member.guestId,
                playerId: "player-b",
                publicPlayerName: "B",
                publicCharacterName: "Ox"
            }
        ]
    });
    assert(
        activated.ok &&
            activated.room.toJSON().roster.every(member =>
                member.playerId && member.publicCharacterName
            ),
        "Case 8: Session activation publishes complete public player assignments"
    );

    console.log(`===== Multi-Guest Lobby Test: ${passed} passed, ${failed} failed =====\n`);
}
