export class Player {

    constructor({
        id,
        name,
        currentRoom
    }) {

        this.id = id;
        this.name = name;
        this.currentRoom = currentRoom;

        this.might = 4;
        this.speed = 4;
        this.sanity = 4;
        this.knowledge = 4;
    }

    moveTo(roomNode) {
        this.currentRoom = roomNode;
    }

    getCurrentRoom() {
        return this.currentRoom;
    }
}