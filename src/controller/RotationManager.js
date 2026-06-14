export class RotationManager {

    static rotate(tile)
    {
        const e =
            tile.exits;

        tile.exits = {

            north: e.west,

            east: e.north,

            south: e.east,

            west: e.south
        };

        tile.rotation += 90;

        if(tile.rotation >= 360)
        {
            tile.rotation = 0;
        }

        return tile;
    }

    static cloneAndRotate(
        original,
        times
    ) {

        const tile =
            original.clone();

        for(
            let i=0;
            i<times;
            i++
        )
        {
            this.rotate(tile);
        }

        return tile;
    }
}



