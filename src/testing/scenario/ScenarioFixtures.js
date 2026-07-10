import { GraphMap }
    from "../../model/GraphMap.js";

import { RoomNode }
    from "../../model/RoomNode.js";

import { RoomTile }
    from "../../model/RoomTile.js";

const HERO_CHARACTERS = [
    "brandon",
    "father",
    "sister",
    "dummy",
    "oxford"
];

let nextPlayerId = 1;

export class ScenarioFixtures {
    static createHero(overrides = {}) {
        const characterId =
            overrides.characterId
            ?? HERO_CHARACTERS[
                nextPlayerId
                % HERO_CHARACTERS.length
            ];

        const player = {
            id:
                overrides.id
                ?? `hero_${nextPlayerId}`,
            name:
                overrides.name
                ?? `Hero ${nextPlayerId}`,
            character: { id: characterId },
            stats: {
                might: overrides.might ?? 4,
                speed: overrides.speed ?? 4,
                sanity: overrides.sanity ?? 4,
                knowledge: overrides.knowledge ?? 4
            }
        };

        nextPlayerId++;
        return player;
    }

    static resetIds() {
        nextPlayerId = 1;
    }

    static createTraitor(overrides = {}) {
        return ScenarioFixtures.createHero({
            ...overrides,
            id:
                overrides.id
                ?? `traitor_1`
        });
    }

    static createEntranceHall() {
        return new RoomNode(
            "entrance_0",
            new RoomTile(
                0,
                "Entrance Hall",
                {
                    north: true,
                    east: true,
                    south: true,
                    west: true
                }
            ),
            0,
            0
        );
    }

    static createGraph() {
        const graph = new GraphMap();
        const entrance =
            ScenarioFixtures
                .createEntranceHall();

        entrance.tile.isRevealed = true;
        graph.addRoom(entrance);
        return graph;
    }

    static createGraphWithRooms(
        roomConfigs = []
    ) {
        const graph =
            ScenarioFixtures
                .createGraph();

        for (const cfg of roomConfigs) {
            const room = new RoomNode(
                cfg.id,
                new RoomTile(
                    cfg.tileId ?? 0,
                    cfg.name ?? "Room",
                    cfg.doors ?? {
                        north: true,
                        east: true,
                        south: true,
                        west: true
                    }
                ),
                cfg.x ?? 0,
                cfg.y ?? 0
            );

            if (cfg.isRevealed) {
                room.tile.isRevealed = true;
            }

            graph.addRoom(room);
        }

        return graph;
    }
}
