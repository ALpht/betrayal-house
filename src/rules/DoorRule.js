import PlacementRule
    from "./PlacementRule.js";

const OPPOSITE = {

    north: "south",
    south: "north",
    east: "west",
    west: "east"
};

export default class DoorRule
extends PlacementRule {

    validate(
        graph,
        tile,
        x,
        y
    ) {

        const dirs = [

            ["north",0,-1],

            ["east",1,0],

            ["south",0,1],

            ["west",-1,0]
        ];

        for(const [dir,dx,dy] of dirs)
        {
            const neighbor =
                graph.getRoom(
                    x+dx,
                    y+dy
                );

            if(!neighbor)
                continue;

            const myDoor =
                tile.exits[dir];

            const theirDoor =
                neighbor.tile.exits[
                    OPPOSITE[dir]
                ];

            if(
                myDoor !==
                theirDoor
            )
            {
                return false;
            }
        }

        return true;
    }
}