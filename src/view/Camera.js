export default class Camera {

    constructor() {

        this.x = 0;

        this.y = 0;

        this.zoom = 1;
    }

    worldToScreen(
        worldX,
        worldY
    ) {
        return {

            x:
                worldX *
                this.zoom +
                this.x,

            y:
                worldY *
                this.zoom +
                this.y
        };
    }
}