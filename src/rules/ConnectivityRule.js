import { PlacementRule }
    from "./PlacementRule.js";

const OPPOSITE = {

    north: "south",
    south: "north",
    east: "west",
    west: "east"
};

export class ConnectivityRule
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

        let connected =
            false;

        for(const [dir,dx,dy] of dirs)
        {
            const neighbor =
                graph.getRoom(
                    x+dx,
                    y+dy
                );

            if(!neighbor)
                continue;

            const opposite =
                OPPOSITE[dir];

            if(
                tile.exits[dir]
                &&
                neighbor.tile.exits[
                    opposite
                ]
            )
            {
                connected = true;
            }
        }

        return connected;
    }
}