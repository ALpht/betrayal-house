export class MapRenderer {

    constructor(
        graph,
        camera
    ) {

        this.graph =
            graph;

        this.camera =
            camera;

        this.tileSize =
            140;
    }

    render(ctx)
    {
        const rooms =
            this.graph
                .getAllRooms();

        for(const room of rooms)
        {
            this.drawRoom(
                ctx,
                room
            );
        }
    }

    drawRoom(
        ctx,
        room
    )
    {
        const size =
            this.tileSize;

        const worldX =
            room.x * size;

        const worldY =
            room.y * size;

        const pos =
            this.camera
                .worldToScreen(
                    worldX,
                    worldY
                );

        ctx.save();

        if (room.tile.isVisible()) {

            ctx.fillStyle =
                "#2c3e50";

            ctx.strokeStyle =
                "#ffffff";

            ctx.lineWidth =
                2;

            ctx.fillRect(
                pos.x,
                pos.y,
                size,
                size
            );

            ctx.strokeRect(
                pos.x,
                pos.y,
                size,
                size
            );

            ctx.fillStyle =
                "#ffffff";

            ctx.font =
                "14px sans-serif";

            ctx.fillText(
                room.tile.name,
                pos.x + 10,
                pos.y + 30
            );

            ctx.fillText(
                `(${room.x},${room.y})`,
                pos.x + 10,
                pos.y + 55
            );

            this.drawDoors(
                ctx,
                room,
                pos.x,
                pos.y,
                size
            );
        }
        else {

            ctx.fillStyle =
                "#1a1a2e";

            ctx.fillRect(
                pos.x,
                pos.y,
                size,
                size
            );

            ctx.strokeStyle =
                "#333";

            ctx.lineWidth =
                1;

            ctx.strokeRect(
                pos.x,
                pos.y,
                size,
                size
            );
        }

        ctx.restore();
    }

    drawDoors(
        ctx,
        room,
        x,
        y,
        size
    )
    {
        ctx.strokeStyle =
            "#00ff00";

        ctx.lineWidth = 5;

        const exits =
            room.tile.exits;

        if(exits.north)
        {
            ctx.beginPath();

            ctx.moveTo(
                x + size/2,
                y
            );

            ctx.lineTo(
                x + size/2,
                y + 20
            );

            ctx.stroke();
        }

        if(exits.east)
        {
            ctx.beginPath();

            ctx.moveTo(
                x + size,
                y + size/2
            );

            ctx.lineTo(
                x + size - 20,
                y + size/2
            );

            ctx.stroke();
        }

        if(exits.south)
        {
            ctx.beginPath();

            ctx.moveTo(
                x + size/2,
                y + size
            );

            ctx.lineTo(
                x + size/2,
                y + size - 20
            );

            ctx.stroke();
        }

        if(exits.west)
        {
            ctx.beginPath();

            ctx.moveTo(
                x,
                y + size/2
            );

            ctx.lineTo(
                x + 20,
                y + size/2
            );

            ctx.stroke();
        }
    }
}
