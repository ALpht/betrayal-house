import { MovementController } from "../../controller/MovementController.js";
import {
    EXPLORATION_DIRECTIONS,
    getExplorationDirectionData
} from "./ExplorationDirections.js";
import { ExplorationTurnResolutionTracker } from "./ExplorationTurnResolutionTracker.js";

export const ExplorationTopology = Object.freeze({
    CONNECTED: "CONNECTED",
    UNKNOWN: "UNKNOWN",
    WALL: "WALL",
    BLOCKED: "BLOCKED"
});

function rejected(reasonCode, topology = null) {
    return {
        accepted: false,
        reasonCode,
        stateChanged: false,
        shouldPublish: false,
        topology
    };
}

export class ExplorationRule {
    constructor({
        graph,
        exploreController,
        turnManager,
        turnResolutionTracker = new ExplorationTurnResolutionTracker()
    }) {
        this.graph = graph;
        this.exploreController = exploreController;
        this.turnManager = turnManager;
        this.turnResolutionTracker = turnResolutionTracker;
    }

    getDirectionAvailability(player, direction) {
        const data = getExplorationDirectionData(direction);
        const sourceRoom = player?.getCurrentRoom?.() || player?.currentRoom || null;
        if (!sourceRoom || !data) {
            return Object.freeze({
                direction,
                topology: ExplorationTopology.BLOCKED,
                enabled: false,
                reasonCode: "INVALID_DIRECTION"
            });
        }

        if (!sourceRoom.tile?.exits?.[direction]) {
            return Object.freeze({
                direction,
                topology: ExplorationTopology.WALL,
                enabled: false,
                reasonCode: "WALL"
            });
        }

        const targetRoom = this.graph.getRoom(
            sourceRoom.x + data.dx,
            sourceRoom.y + data.dy
        );
        if (targetRoom) {
            const reciprocalEdge =
                sourceRoom.getNeighbors().includes(targetRoom) &&
                targetRoom.getNeighbors().includes(sourceRoom) &&
                Boolean(targetRoom.tile?.exits?.[data.opposite]);

            return Object.freeze({
                direction,
                topology: reciprocalEdge
                    ? ExplorationTopology.CONNECTED
                    : ExplorationTopology.BLOCKED,
                enabled: reciprocalEdge,
                reasonCode: reciprocalEdge ? null : "BLOCKED"
            });
        }

        const plan = this.exploreController.plan(sourceRoom, direction);
        return Object.freeze({
            direction,
            topology: ExplorationTopology.UNKNOWN,
            enabled: plan.accepted,
            reasonCode: plan.accepted
                ? null
                : plan.reasonCode || "NO_PLACEABLE_TILE"
        });
    }

    getAllDirectionAvailability(player) {
        return EXPLORATION_DIRECTIONS.map(direction =>
            this.getDirectionAvailability(player, direction)
        );
    }

    executeMove(player, direction) {
        if (!player || !this.turnManager.isCurrentPlayer(player)) {
            return rejected("NOT_CURRENT_PLAYER");
        }

        const availability = this.getDirectionAvailability(player, direction);
        if (!availability.enabled) {
            return rejected(
                availability.reasonCode || "ACTION_REJECTED",
                availability.topology
            );
        }

        if (availability.topology === ExplorationTopology.CONNECTED) {
            const data = getExplorationDirectionData(direction);
            const sourceRoom = player.getCurrentRoom?.() || player.currentRoom;
            const targetRoom = this.graph.getRoom(
                sourceRoom.x + data.dx,
                sourceRoom.y + data.dy
            );
            const moved = MovementController.movePlayer(player, targetRoom);
            return moved
                ? {
                    accepted: true,
                    reasonCode: null,
                    stateChanged: true,
                    shouldPublish: true,
                    topology: ExplorationTopology.CONNECTED,
                    revealed: false
                }
                : rejected("ACTION_REJECTED", ExplorationTopology.CONNECTED);
        }

        const tracked = this.turnResolutionTracker.track(() => {
            const explored = this.exploreController.explore(
                player.getCurrentRoom?.() || player.currentRoom,
                direction
            );
            if (!explored.accepted) {
                return explored;
            }

            const moved = MovementController.movePlayer(player, explored.room);
            return {
                ...explored,
                accepted: moved,
                reasonCode: moved ? null : "ACTION_REJECTED"
            };
        });

        if (!tracked.value?.accepted) {
            return rejected(
                tracked.value?.reasonCode || "ACTION_REJECTED",
                ExplorationTopology.UNKNOWN
            );
        }

        if (!tracked.resolution.turnResolvedByHauntLifecycle) {
            this.turnManager.nextTurn();
        }

        return {
            accepted: true,
            reasonCode: null,
            stateChanged: true,
            shouldPublish: true,
            topology: ExplorationTopology.UNKNOWN,
            revealed: true,
            resolution: tracked.resolution
        };
    }
}
