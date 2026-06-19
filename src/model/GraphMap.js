export class GraphMap {

    constructor() {

        this.rooms =
            new Map();

        this.positionIndex =
            new Map();
    }

    getKey(x,y) {

        return `${x},${y}`;
    }

    addRoom(room) {

        this.rooms.set(
            room.id,
            room
        );

        this.positionIndex.set(
            this.getKey(
                room.x,
                room.y
            ),
            room
        );
    }

    getRoom(x,y) {

        return this.positionIndex.get(
            this.getKey(x,y)
        );
    }

    hasRoom(x,y) {

        return this.positionIndex.has(
            this.getKey(x,y)
        );
    }

    getAllRooms() {

        return [
            ...this.rooms.values()
        ];
    }

    clear() {

        this.rooms.clear();

        this.positionIndex.clear();

    }
}


