export function readMultiplayerMapState(localSession) {
    const graph = localSession?.getGraph?.();
    const playerManager = localSession?.getPlayerManager?.();
    const turnManager = localSession?.getTurnManager?.();

    const rooms = graph?.getAllRooms?.().map(room => ({
        roomId: room.id,
        name: room.tile?.name || String(room.id),
        x: room.x,
        y: room.y,
        rotation: room.tile?.rotation || 0,
        isRevealed: Boolean(room.tile?.isRevealed),
        connectedRoomIds: room.getNeighbors?.().map(neighbor => neighbor.id) || []
    })) || [];

    const players = playerManager?.getAllPlayers?.().map(player => ({
        playerId: player.id,
        displayName: player.name || player.id,
        roomId: player.currentRoom?.id ?? null
    })) || [];

    return {
        rooms,
        players,
        currentPlayerId: turnManager?.getCurrentPlayer?.()?.id || null
    };
}
