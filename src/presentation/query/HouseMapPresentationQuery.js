import { HouseMapPresentationModel } from "../model/HouseMapPresentationModel.js";

function isPresent(value) {
    return value !== null && value !== undefined;
}

function compareIds(left, right) {
    return String(left).localeCompare(String(right), undefined, {
        numeric: true
    });
}

export class HouseMapPresentationQuery {
    buildModel(projection, {
        focusPlayerId = null,
        includePlayerMarkers = true
    } = {}) {
        const map = projection?.map;
        const sourceRooms = Array.isArray(map?.rooms) ? map.rooms : [];
        const normalizedRooms = sourceRooms
            .filter(room =>
                room &&
                isPresent(room.roomId) &&
                typeof room.name === "string" &&
                Number.isFinite(room.x) &&
                Number.isFinite(room.y) &&
                Number.isFinite(room.rotation)
            )
            .map(room => ({
                roomId: room.roomId,
                name: room.name,
                x: room.x,
                y: room.y,
                rotation: room.rotation,
                isRevealed: room.isRevealed === true,
                connections: Array.isArray(room.connections)
                    ? [...new Set(room.connections.filter(isPresent))].sort(compareIds)
                    : []
            }))
            .sort((left, right) =>
                left.y - right.y ||
                left.x - right.x ||
                compareIds(left.roomId, right.roomId)
            );
        const sourcePlayers = Array.isArray(map?.players) ? map.players : [];
        const focusedPlayer = focusPlayerId
            ? sourcePlayers.find(player => player?.playerId === focusPlayerId)
            : null;
        const focusedRoomId = focusedPlayer?.roomId ?? null;
        const rooms = focusPlayerId
            ? normalizedRooms.filter(room => room.roomId === focusedRoomId)
            : normalizedRooms;
        const roomIds = new Set(rooms.map(room => room.roomId));
        const currentPlayerId = map?.currentPlayerId ?? null;
        const players = (includePlayerMarkers ? sourcePlayers : [])
            .filter(player =>
                player &&
                isPresent(player.playerId) &&
                typeof player.displayName === "string" &&
                roomIds.has(player.roomId) &&
                (!focusPlayerId || player.playerId === focusPlayerId)
            )
            .map(player => ({
                playerId: player.playerId,
                displayName: player.displayName,
                roomId: player.roomId,
                isCurrentPlayer: player.playerId === currentPlayerId
            }))
            .sort((left, right) => compareIds(left.playerId, right.playerId));
        const visibleConnections = rooms.map(room => ({
            ...room,
            connections: room.connections.filter(roomId => roomIds.has(roomId))
        }));

        return new HouseMapPresentationModel({
            rooms: visibleConnections,
            players,
            currentPlayerId
        });
    }
}
