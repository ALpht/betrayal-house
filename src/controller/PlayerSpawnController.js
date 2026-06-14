export class PlayerSpawnController {

    static spawnPlayer(
        player,
        roomNode
    ) {

        if (!roomNode) {

            throw new Error(
                'Spawn room not found'
            );

        }

        player.currentRoom =
            roomNode;

        return player;
    }
}