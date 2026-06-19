import { RoomNode }
    from "../model/RoomNode.js";

import { PlayerStats }
    from "../model/PlayerStats.js";

import { CharacterFactory }
    from "../model/CharacterFactory.js";

import { RoomDefinitions }
    from "../data/RoomDefinitions.js";

import { EventDefinitions }
    from "../data/EventDefinitions.js";

import { ItemDefinitions }
    from "../data/ItemDefinitions.js";

import { OmenDefinitions }
    from "../data/OmenDefinitions.js";

import { SNAPSHOT_VERSION }
    from "./GameSnapshot.js";

const DEFINITION_MAP = {

    event: EventDefinitions,
    item: ItemDefinitions,
    omen: OmenDefinitions

};

function lookupCard(cardId, deckType) {

    const list =
        DEFINITION_MAP[deckType];

    if (!list) return null;

    return list.find(
        c => c.id === cardId
    ) || null;

}

function findCardInAnyDeck(cardId) {

    for (const type
        of ["event", "item", "omen"]) {

        const found =
            lookupCard(cardId, type);

        if (found) return found;

    }

    return null;

}

export class GameDeserializer {

    validateSnapshot(snapshot) {

        const required = [
            "version",
            "gameState",
            "rooms",
            "players",
            "turnManager",
            "decks",
            "hauntTracker",
            "traitorPlayerId"
        ];

        if (
            "scenarioId" in snapshot
            && snapshot.scenarioId !== null
            && typeof snapshot.scenarioId
                !== "string"
        ) {

            throw new Error(
                "Invalid snapshot: scenarioId must be a string or null"
            );

        }

        if (
            "scenarioState" in snapshot
            && snapshot.scenarioState !== null
            && (
                typeof snapshot
                    .scenarioState
                !== "object"
            )
        ) {

            throw new Error(
                "Invalid snapshot: scenarioState must be an object or null"
            );

        }

        for (const key of required) {

            if (!(key in snapshot)) {

                throw new Error(
                    `Invalid snapshot: missing "${key}"`
                );

            }

        }

        if (
            !Array.isArray(snapshot.rooms)
        ) {

            throw new Error(
                "Invalid snapshot: rooms must be an array"
            );

        }

        if (
            !Array.isArray(snapshot.players)
        ) {

            throw new Error(
                "Invalid snapshot: players must be an array"
            );

        }

    }

    fromSnapshot(
        snapshot,
        graph,
        playerManager,
        turnManager,
        gameStateManager,
        eventDeck,
        itemDeck,
        omenDeck,
        tileDeck,
        hauntTracker
    ) {

        this.validateSnapshot(snapshot);

        if (
            snapshot.version
            !== SNAPSHOT_VERSION
        ) {

            throw new Error(
                `Unsupported snapshot version: ${snapshot.version}`
            );

        }

        /* =========================
         * GraphMap — clear + rebuild
         * ========================= */

        const rooms =
            graph.getAllRooms();

        for (const room of rooms) {

            const neighbors =
                room.getNeighbors();

            for (const n of neighbors) {

                room.removeNeighbor(n);

            }

        }

        graph.clear();

        for (let i = 0;
            i < snapshot.rooms.length;
            i++
        ) {

            const rd = snapshot.rooms[i];

            const definition =
                RoomDefinitions.find(
                    t => t.id === rd.tileId
                );

            if (!definition) {

                console.warn(
                    `[LOAD] Unknown tileId: ${rd.tileId}`
                );

                continue;

            }

            const tile =
                definition.clone();

            tile.rotation = rd.rotation;
            tile.isRevealed = rd.isRevealed;
            tile.isVisited = rd.isVisited;

            const node =
                new RoomNode(
                    i,
                    tile,
                    rd.x,
                    rd.y
                );

            graph.addRoom(node);

        }

        /* =========================
         * GraphMap — rebuild neighbors
         * ========================= */

        const dirs = [
            [0, -1],
            [1, 0],
            [0, 1],
            [-1, 0]
        ];

        for (const room
            of graph.getAllRooms()) {

            for (const [dx, dy]
                of dirs) {

                const neighbor =
                    graph.getRoom(
                        room.x + dx,
                        room.y + dy
                    );

                if (neighbor) {

                    room.addNeighbor(
                        neighbor
                    );

                }

            }

        }

        /* =========================
         * PlayerManager — clear + rebuild
         * ========================= */

        for (const p
            of playerManager.getAllPlayers()) {

            p.currentRoom = null;

        }

        playerManager.clear();

        for (const pd
            of snapshot.players) {

            const player =
                CharacterFactory.create(
                    pd.characterId
                );

            if (!player) {

                console.warn(
                    `[LOAD] Unknown characterId: ${pd.characterId}`
                );

                continue;

            }

            player.id = pd.id;

            player.stats =
                new PlayerStats(pd.stats);

            player.items =
                pd.items.map(
                    id => findCardInAnyDeck(id)
                ).filter(Boolean);

            player.omens =
                pd.omens.map(
                    id => findCardInAnyDeck(id)
                ).filter(Boolean);

            player.isAlive =
                pd.isAlive;

            if (
                pd.currentRoomX !== null
                && pd.currentRoomY !== null
            ) {

                player.currentRoom =
                    graph.getRoom(
                        pd.currentRoomX,
                        pd.currentRoomY
                    );

            }

            playerManager.addPlayer(
                player
            );

        }

        /* =========================
         * TurnManager — restore state silently
         * ========================= */

        const players =
            playerManager.getAllPlayers();

        const targetIndex =
            snapshot.turnManager
                .turnIndex;

        const clampedIndex =
            players.length > 0
            && targetIndex < players.length
                ? targetIndex
                : 0;

        turnManager.restoreState(
            players,
            clampedIndex,
            snapshot.turnManager.started
        );

        /* =========================
         * CardDecks — restore remaining + discard
         * ========================= */

        function restoreDeck(
            deck,
            remainingIds,
            discardIds,
            type
        ) {

            deck.reset();

            deck.cards =
                remainingIds.map(
                    id => lookupCard(id, type)
                ).filter(Boolean);

            deck.discardPile =
                discardIds.map(
                    id => lookupCard(id, type)
                ).filter(Boolean);

        }

        restoreDeck(
            eventDeck,
            snapshot.decks.event.remaining,
            snapshot.decks.event.discard,
            "event"
        );

        restoreDeck(
            itemDeck,
            snapshot.decks.item.remaining,
            snapshot.decks.item.discard,
            "item"
        );

        restoreDeck(
            omenDeck,
            snapshot.decks.omen.remaining,
            snapshot.decks.omen.discard,
            "omen"
        );

        /* =========================
         * TileDeck — restore remaining
         * ========================= */

        tileDeck.tiles =
            snapshot.decks.tile.remaining.map(
                tileId => {

                    const def =
                        RoomDefinitions.find(
                            t => t.id === tileId
                        );

                    return def
                        ? def.clone()
                        : null;

                }
            ).filter(Boolean);

        /* =========================
         * HauntTracker — restore silently
         * ========================= */

        const restoredRecords =
            snapshot.hauntTracker
                .records.map(
                    rec => {

                        const card =
                            findCardInAnyDeck(
                                rec.cardId
                            );

                        const room =
                            rec.roomX !== null
                            && rec.roomY !== null

                                ? graph.getRoom(
                                    rec.roomX,
                                    rec.roomY
                                )

                                : null;

                        return {
                            card: card || { id: rec.cardId },
                            playerId: rec.playerId,
                            roomId: room
                                ? room.id
                                : null,
                            timestamp: rec.timestamp,
                            omenIndex: rec.omenIndex
                        };

                    }
                );

        hauntTracker.restoreFromSnapshot(
            restoredRecords,
            snapshot.hauntTracker.omenCount
        );

        /* =========================
         * GameStateManager — set current state
         * ========================= */

        gameStateManager.current =
            snapshot.gameState;

        gameStateManager.setTraitorPlayerId(
            snapshot.traitorPlayerId
        );

    }

}
