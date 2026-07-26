import { RoomNode } from "../model/RoomNode.js";
import { RotationManager } from "./RotationManager.js";
import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";
import { ExplorationPlacementPlanner } from "../gameplay/exploration/ExplorationPlacementPlanner.js";
import {
    EXPLORATION_DIRECTION_DATA,
    getExplorationDirectionData
} from "../gameplay/exploration/ExplorationDirections.js";

export class ExploreController {
    constructor(
        graph,
        deck,
        planner = new ExplorationPlacementPlanner()
    ) {
        this.graph = graph;
        this.deck = deck;
        this.planner = planner;
        this.nextId = graph.getAllRooms().length;
    }

    getTargetCoordinate(sourceRoom, direction) {
        const data = getExplorationDirectionData(direction);
        if (!sourceRoom || !data) {
            return null;
        }

        return {
            x: sourceRoom.x + data.dx,
            y: sourceRoom.y + data.dy
        };
    }

    plan(sourceRoom, direction) {
        const targetCoordinate = this.getTargetCoordinate(sourceRoom, direction);
        if (!targetCoordinate) {
            return {
                accepted: false,
                reasonCode: "INVALID_DIRECTION"
            };
        }

        return this.planner.planExploration({
            sourceRoom,
            direction,
            targetCoordinate,
            tileCandidates: this.deck.getRemainingTiles(),
            graphMapView: this.graph,
            deckVersion: this.deck.getVersion()
        });
    }

    explore(sourceRoom, direction) {
        const plan = this.plan(sourceRoom, direction);
        if (!plan.accepted) {
            return {
                accepted: false,
                reasonCode: plan.reasonCode,
                room: null,
                plan
            };
        }

        const target = plan.targetCoordinate;
        const currentSource = this.graph.getRoom(sourceRoom.x, sourceRoom.y);
        if (
            currentSource !== sourceRoom ||
            this.graph.hasRoom(target.x, target.y) ||
            this.deck.getVersion() !== plan.deckVersion
        ) {
            return {
                accepted: false,
                reasonCode: "STALE_EXPLORATION_PLAN",
                room: null,
                plan
            };
        }

        const tileCandidate = this.deck
            .getRemainingTiles()[plan.selectedTileIndex];
        if (!tileCandidate || tileCandidate.id !== plan.selectedTileId) {
            return {
                accepted: false,
                reasonCode: "STALE_EXPLORATION_PLAN",
                room: null,
                plan
            };
        }

        const rotatedTile = RotationManager.cloneAndRotate(
            tileCandidate,
            plan.rotation
        );
        const room = new RoomNode(
            this.nextId,
            rotatedTile,
            target.x,
            target.y
        );
        const neighbors = this.#getReciprocalDoorNeighbors(room);

        const entryData = getExplorationDirectionData(direction);
        if (
            !entryData ||
            !neighbors.includes(sourceRoom) ||
            !sourceRoom.tile?.exits?.[direction] ||
            !rotatedTile.exits?.[entryData.opposite]
        ) {
            return {
                accepted: false,
                reasonCode: "STALE_EXPLORATION_PLAN",
                room: null,
                plan
            };
        }

        const deckCommit = this.deck.commitPlannedDraw({
            selectedTileId: plan.selectedTileId,
            selectedTileIndex: plan.selectedTileIndex,
            expectedVersion: plan.deckVersion
        });
        if (!deckCommit.accepted) {
            return {
                accepted: false,
                reasonCode: deckCommit.reasonCode,
                room: null,
                plan
            };
        }

        this.nextId++;
        this.graph.addRoom(room);
        for (const neighbor of neighbors) {
            room.addNeighbor(neighbor);
            neighbor.addNeighbor(room);
        }

        EventBus.emit(EventTypes.ROOM_DISCOVERED, {
            roomId: room.id,
            roomName: room.tile.name,
            x: room.x,
            y: room.y
        });
        EventBus.emit(EventTypes.MAP_UPDATED, {
            roomId: room.id
        });

        return {
            accepted: true,
            reasonCode: null,
            room,
            plan
        };
    }

    #getReciprocalDoorNeighbors(room) {
        const neighbors = [];

        for (const [direction, data] of Object.entries(
            EXPLORATION_DIRECTION_DATA
        )) {
            const neighbor = this.graph.getRoom(
                room.x + data.dx,
                room.y + data.dy
            );
            if (
                neighbor &&
                room.tile?.exits?.[direction] &&
                neighbor.tile?.exits?.[data.opposite]
            ) {
                neighbors.push(neighbor);
            }
        }

        return neighbors;
    }
}
