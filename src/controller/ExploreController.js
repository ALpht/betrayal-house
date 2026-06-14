import RoomNode from "../model/RoomNode.js";

import RotationManager
    from "./RotationManager.js";

import DoorRule
    from "../rules/DoorRule.js";

import ConnectivityRule
    from "../rules/ConnectivityRule.js";

export default class ExploreController {

    constructor(
        graph,
        deck
    ) {
        this.graph =
            graph;

        this.deck =
            deck;

        this.rules = [

            new DoorRule(),

            new ConnectivityRule()

        ];

        this.nextId =
            graph.getAllRooms().length;
    }

    explore(
        x,
        y
    ) {

        if(
            this.graph.hasRoom(
                x,
                y
            )
        )
        {
            console.warn(
                `[ROOM] (${x},${y}) 已存在房間`
            );

            return false;
        }

        if(
            this.deck.isEmpty()
        )
        {
            console.warn(
                "[DECK] 牌庫已空"
            );

            return false;
        }

        const tile =
            this.deck.peek();

        console.log(
            "嘗試放置:",
            tile.name,
            x,
            y
        );

        for(
            let rot = 0;
            rot < 4;
            rot++
        )
        {
            const rotated =
                RotationManager
                    .cloneAndRotate(
                        tile,
                        rot
                    );

            console.log(
                "旋轉",
                rot,
                rotated.exits
            );

            const valid =
                this.validate(
                    rotated,
                    x,
                    y
                );

            console.log(
                "驗證結果",
                valid
            );

            if(valid)
            {
                const room =
                    new RoomNode(
                        this.nextId++,
                        rotated,
                        x,
                        y
                    );

                this.graph.addRoom(
                    room
                );

                this.linkNeighbors(
                    room
                );

                this.deck.draw();

                console.log(
                    `[ROOM] 放置成功 ${rotated.name}`
                );

                console.log(
                    `[DECK] 剩餘 ${this.deck.count()} 張`
                );

                return room;
            }
        }

        console.log(
            `[ROOM] 無法放置 ${tile.name}`
        );

        this.deck.moveTopToBottom();

        console.log(
            "[DECK] 已移至牌庫底部"
        );

        return false;
    }

    validate(
        tile,
        x,
        y
    ) {
        for(
            const rule
            of this.rules
        )
        {
            if(
                !rule.validate(
                    this.graph,
                    tile,
                    x,
                    y
                )
            )
            {
                return false;
            }
        }

        return true;
    }

    linkNeighbors(
        room
    ) {

        const dirs = [

            [0,-1],
            [1,0],
            [0,1],
            [-1,0]

        ];

        for(
            const [dx,dy]
            of dirs
        )
        {
            const neighbor =
                this.graph.getRoom(
                    room.x + dx,
                    room.y + dy
                );

            if(neighbor)
            {
                room.addNeighbor(
                    neighbor
                );

                neighbor.addNeighbor(
                    room
                );
            }
        }
    }
}