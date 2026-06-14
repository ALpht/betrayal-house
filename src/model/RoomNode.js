export class RoomNode {

    constructor(
        id,
        tile,
        x,
        y
    ) {
        this.id = id;

        this.tile = tile;

        this.x = x;

        this.y = y;

        this.neighbors =
            new Set();
    }

    addNeighbor(
        roomNode
    ) {
        this.neighbors.add(
            roomNode
        );
    }

    removeNeighbor(
        roomNode
    ) {
        this.neighbors.delete(
            roomNode
        );
    }

    getNeighbors()
    {
        return Array.from(
            this.neighbors
        );
    }
}


