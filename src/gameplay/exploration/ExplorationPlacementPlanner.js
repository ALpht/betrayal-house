import { RotationManager } from "../../controller/RotationManager.js";
import { getExplorationDirectionData } from "./ExplorationDirections.js";

function rejected(reasonCode) {
    return Object.freeze({
        accepted: false,
        reasonCode
    });
}

export class ExplorationPlacementPlanner {
    planExploration({
        sourceRoom,
        direction,
        targetCoordinate,
        tileCandidates = [],
        graphMapView,
        deckVersion
    } = {}) {
        const directionData = getExplorationDirectionData(direction);
        if (
            !sourceRoom ||
            !directionData ||
            !targetCoordinate ||
            !Number.isFinite(targetCoordinate.x) ||
            !Number.isFinite(targetCoordinate.y)
        ) {
            return rejected("INVALID_EXPLORATION_PLAN");
        }

        if (!sourceRoom.tile?.exits?.[direction]) {
            return rejected("WALL");
        }

        if (graphMapView?.hasRoom?.(
            targetCoordinate.x,
            targetCoordinate.y
        )) {
            return rejected("TARGET_OCCUPIED");
        }

        for (let selectedTileIndex = 0;
            selectedTileIndex < tileCandidates.length;
            selectedTileIndex++
        ) {
            const tile = tileCandidates[selectedTileIndex];
            for (let rotation = 0; rotation < 4; rotation++) {
                const rotated = RotationManager.cloneAndRotate(tile, rotation);
                if (rotated.exits?.[directionData.opposite]) {
                    return Object.freeze({
                        accepted: true,
                        reasonCode: null,
                        sourceRoomId: sourceRoom.id,
                        direction,
                        targetCoordinate: Object.freeze({
                            x: targetCoordinate.x,
                            y: targetCoordinate.y
                        }),
                        selectedTileId: tile.id,
                        selectedTileIndex,
                        rotation,
                        deckVersion
                    });
                }
            }
        }

        return rejected("NO_PLACEABLE_TILE");
    }
}
