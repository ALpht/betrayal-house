import { GameSnapshot }
    from "./GameSnapshot.js";

export class GameSerializer {

    toSnapshot(
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

        const rooms =
            graph.getAllRooms().map(
                room => ({
                    tileId: room.tile.id,
                    x: room.x,
                    y: room.y,
                    rotation: room.tile.rotation,
                    isRevealed: room.tile.isRevealed,
                    isVisited: room.tile.isVisited
                })
            );

        const players =
            playerManager.getAllPlayers().map(
                p => {

                    const pos =
                        p.getPosition();

                    return {
                        id: p.id,
                        characterId: p.character.id,
                        currentRoomX: pos ? pos.x : null,
                        currentRoomY: pos ? pos.y : null,
                        stats: {
                            speed: p.stats.speed,
                            might: p.stats.might,
                            sanity: p.stats.sanity,
                            knowledge: p.stats.knowledge
                        },
                        items: p.items.map(c => c.id),
                        omens: p.omens.map(c => c.id),
                        isAlive: p.isAlive
                    };

                }
            );

        const roomsById =
            new Map();

        for (const room
            of graph.getAllRooms()) {

            roomsById.set(
                room.id,
                room
            );

        }

        const hauntRecords =
            hauntTracker.getRecords().map(
                rec => {

                    const room =
                        roomsById.get(
                            rec.roomId
                        );

                    return {
                        cardId: rec.card.id,
                        playerId: rec.playerId,
                        roomX: room ? room.x : null,
                        roomY: room ? room.y : null,
                        timestamp: rec.timestamp,
                        omenIndex: rec.omenIndex
                    };

                }
            );

        const snapshot = new GameSnapshot({

            gameState:
                gameStateManager.getState(),

            rooms,

            players,

            turnManager: {
                turnIndex:
                    turnManager
                        .getCurrentPlayerIndex(),
                started:
                    turnManager.hasStarted()
            },

            decks: {

                event: {
                    remaining:
                        eventDeck.cards.map(c => c.id),
                    discard:
                        eventDeck.discardPile.map(c => c.id)
                },

                item: {
                    remaining:
                        itemDeck.cards.map(c => c.id),
                    discard:
                        itemDeck.discardPile.map(c => c.id)
                },

                omen: {
                    remaining:
                        omenDeck.cards.map(c => c.id),
                    discard:
                        omenDeck.discardPile.map(c => c.id)
                },

                tile: {
                    remaining:
                        tileDeck.tiles.map(t => t.id)
                }

            },

            hauntTracker: {
                omenCount:
                    hauntTracker.getOmenCount(),
                records: hauntRecords
            }

        });

        return snapshot;

    }

}
