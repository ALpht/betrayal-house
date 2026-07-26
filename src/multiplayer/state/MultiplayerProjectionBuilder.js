import { GameStateManager } from "../../state/GameStateManager.js";
import { InformationScope } from "../../scenario/information/InformationScope.js";

function emptyVictory() {
    return {
        completed: false,
        winner: null,
        reason: null
    };
}

function emptyTurn() {
    return {
        playerId: null,
        displayName: null,
        isViewerTurn: false
    };
}

function buildCharacter(player) {
    if (!player) {
        return null;
    }

    return {
        playerId: player.id,
        displayName: player.name || player.id,
        characterName: player.character?.name || null,
        currentRoomName: player.currentRoom?.tile?.name || null,
        speed: player.stats?.speed ?? null,
        might: player.stats?.might ?? null,
        sanity: player.stats?.sanity ?? null,
        knowledge: player.stats?.knowledge ?? null,
        inventoryCount: player.items?.length || 0,
        omenCount: player.omens?.length || 0,
        lifeState: player.isAlive ? "alive" : "dead"
    };
}

function buildScenario(runtime, visiblePackets) {
    if (!runtime) {
        return null;
    }

    const metadata = runtime.getScenarioMetadata();
    const objectivePackets = visiblePackets.filter(
        packet => packet.scope === InformationScope.OBJECTIVE
    );

    return {
        title: metadata?.title || null,
        description: metadata?.description || null,
        objectives: objectivePackets.length > 0
            ? objectivePackets.map(packet => structuredClone(packet.payload))
            : structuredClone(metadata?.objectives || null)
    };
}

function buildCards(visiblePackets) {
    return visiblePackets
        .filter(packet => packet.scope === InformationScope.CARD)
        .map(packet => structuredClone(packet.payload));
}

function buildActions(runtime, { gameEnded, currentPlayerId, viewerId }) {
    if (!runtime || gameEnded) {
        return [];
    }

    return runtime.getActionAvailability().map(action => ({
        type: action.type,
        label: action.label || action.type,
        enabled:
            Boolean(action.enabled) &&
            currentPlayerId === viewerId &&
            !gameEnded
    }));
}

function compareIds(left, right) {
    return String(left).localeCompare(String(right), undefined, {
        numeric: true
    });
}

function buildMap(mapState = {}) {
    const sourceRooms = Array.isArray(mapState.rooms) ? mapState.rooms : [];
    const revealedRoomIds = new Set(
        sourceRooms
            .filter(room => room?.isRevealed)
            .map(room => room.roomId)
    );
    const rooms = sourceRooms
        .filter(room => room?.isRevealed && revealedRoomIds.has(room.roomId))
        .map(room => ({
            roomId: room.roomId,
            name: room.name,
            x: room.x,
            y: room.y,
            rotation: room.rotation,
            isRevealed: true,
            connections: [...new Set(
                (Array.isArray(room.connectedRoomIds)
                    ? room.connectedRoomIds
                    : []
                ).filter(roomId => revealedRoomIds.has(roomId))
            )].sort(compareIds)
        }))
        .sort((left, right) =>
            left.y - right.y ||
            left.x - right.x ||
            compareIds(left.roomId, right.roomId)
        );
    const players = (Array.isArray(mapState.players) ? mapState.players : [])
        .filter(player =>
            player &&
            revealedRoomIds.has(player.roomId)
        )
        .map(player => ({
            playerId: player.playerId,
            displayName: player.displayName,
            roomId: player.roomId
        }))
        .sort((left, right) => compareIds(left.playerId, right.playerId));

    return {
        rooms,
        players,
        currentPlayerId: mapState.currentPlayerId ?? null
    };
}

export class MultiplayerProjectionBuilder {
    constructor({
        getRuntime = () => null,
        getRouter = () => null,
        getTurnManager = () => null,
        getPlayerManager = () => null,
        getVictoryResult = () => null,
        isGameEnded = () => false,
        getLifecycleState = () => GameStateManager.getState(),
        getTraitorPlayerId = () => GameStateManager.getTraitorPlayerId?.() || null,
        getMapState = () => ({ rooms: [], players: [], currentPlayerId: null })
    } = {}) {
        this.getRuntime = getRuntime;
        this.getRouter = getRouter;
        this.getTurnManager = getTurnManager;
        this.getPlayerManager = getPlayerManager;
        this.getVictoryResult = getVictoryResult;
        this.isGameEnded = isGameEnded;
        this.getLifecycleState = getLifecycleState;
        this.getTraitorPlayerId = getTraitorPlayerId;
        this.getMapState = getMapState;
    }

    build(viewerId) {
        const runtime = this.getRuntime();
        const router = this.getRouter();
        const turnManager = this.getTurnManager();
        const playerManager = this.getPlayerManager();
        const currentPlayer = turnManager?.getCurrentPlayer?.() || null;
        const viewerPlayer = playerManager?.getPlayer?.(viewerId) || currentPlayer;
        const visiblePackets = router
            ? router.getVisiblePackets(viewerId, this.getTraitorPlayerId())
            : [];
        const victoryResult = this.getVictoryResult();
        const victoryJson = victoryResult?.toJSON?.() || victoryResult || null;

        return {
            viewerId,
            currentPlayerId: currentPlayer?.id || null,
            lifecycleState: this.getLifecycleState?.() || null,
            gameEnded: this.isGameEnded(),
            turn: currentPlayer
                ? {
                    playerId: currentPlayer.id,
                    displayName: currentPlayer.name || currentPlayer.id,
                    isViewerTurn: currentPlayer.id === viewerId
                }
                : emptyTurn(),
            character: buildCharacter(viewerPlayer),
            scenario: buildScenario(runtime, visiblePackets),
            victory: victoryJson
                ? {
                    completed: true,
                    winner: victoryJson.winner || null,
                    reason: victoryJson.reason || null
                }
                : emptyVictory(),
            cards: buildCards(visiblePackets),
            actions: buildActions(runtime, {
                gameEnded: this.isGameEnded(),
                currentPlayerId: currentPlayer?.id || null,
                viewerId
            }),
            map: buildMap(this.getMapState())
        };
    }

    buildPublic() {
        return {
            map: buildMap(this.getMapState())
        };
    }
}
