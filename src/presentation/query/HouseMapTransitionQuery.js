import { HouseMapTransitionModel } from "../model/HouseMapTransitionModel.js";

function compareIds(left, right) {
    return String(left).localeCompare(String(right), undefined, {
        numeric: true
    });
}

function roomsOf(model) {
    return Array.isArray(model?.rooms) ? model.rooms : [];
}

function playersOf(model) {
    return Array.isArray(model?.players) ? model.players : [];
}

export class HouseMapTransitionQuery {
    buildTransition(previousModel, currentModel) {
        const currentPlayerId = currentModel?.currentPlayerId ?? null;
        if (!previousModel) {
            return new HouseMapTransitionModel({
                currentPlayerId,
                isInitialRender: true
            });
        }

        const previousRoomIds = new Set(
            roomsOf(previousModel).map(room => room.roomId)
        );
        const revealedRoomIds = roomsOf(currentModel)
            .map(room => room.roomId)
            .filter(roomId => !previousRoomIds.has(roomId))
            .sort(compareIds);
        const previousPlayers = new Map(
            playersOf(previousModel).map(player => [player.playerId, player])
        );
        const movedPlayers = playersOf(currentModel)
            .filter(player => {
                const previous = previousPlayers.get(player.playerId);
                return previous && previous.roomId !== player.roomId;
            })
            .map(player => {
                const previous = previousPlayers.get(player.playerId);
                return {
                    playerId: player.playerId,
                    fromRoomId: previous.roomId,
                    toRoomId: player.roomId
                };
            })
            .sort((left, right) => compareIds(left.playerId, right.playerId));
        const previousCurrentPlayerId = previousModel.currentPlayerId ?? null;

        return new HouseMapTransitionModel({
            revealedRoomIds,
            movedPlayers,
            previousCurrentPlayerId,
            currentPlayerId,
            didTurnChange: previousCurrentPlayerId !== currentPlayerId,
            isInitialRender: false
        });
    }

    focusForPlayer(transition, playerId) {
        return new HouseMapTransitionModel({
            revealedRoomIds: transition?.revealedRoomIds || [],
            movedPlayers: (transition?.movedPlayers || []).filter(
                player => player.playerId === playerId
            ),
            previousCurrentPlayerId: transition?.previousCurrentPlayerId ?? null,
            currentPlayerId: transition?.currentPlayerId ?? null,
            didTurnChange: transition?.didTurnChange,
            isInitialRender: transition?.isInitialRender
        });
    }
}
