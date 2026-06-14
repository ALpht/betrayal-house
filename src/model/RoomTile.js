export class RoomTile {

    constructor(
        id,
        name,
        exits
    ) {

        this.id = id;

        this.name = name;

        this.rotation = 0;

        this.isRevealed = false;

        this.isVisited = false;

        this.exits = {
            north: exits.north,
            east: exits.east,
            south: exits.south,
            west: exits.west
        };
    }

    clone() {

        const tile =
            new RoomTile(
                this.id,
                this.name,
                {...this.exits}
            );

        tile.rotation =
            this.rotation;

        tile.isRevealed =
            this.isRevealed;

        tile.isVisited =
            this.isVisited;

        return tile;
    }
}


