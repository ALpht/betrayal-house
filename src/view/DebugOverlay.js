export class DebugOverlay {

    constructor(graph) {

        this.graph = graph;
        this.lines = [];

        this.maxLines = 12;
    }

    log(message) {

        this.lines.push(message);

        if(
            this.lines.length >
            this.maxLines
        )
        {
            this.lines.shift();
        }
    }

    render(ctx) {

        ctx.save();

        ctx.fillStyle =
            "rgba(0,0,0,.7)";

        ctx.fillRect(
            10,
            10,
            350,
            250
        );

        ctx.fillStyle =
            "#00ff00";

        ctx.font =
            "14px monospace";

        let y = 35;

        if (this.graph) {
            const rooms =
                this.graph.getAllRooms();

            const revealed =
                rooms.filter(
                    r => r.tile.isRevealed
                ).length;

            ctx.fillText(
                `Rooms: ${revealed}/${rooms.length}`,
                20,
                y
            );

            y += 18;
        }

        for(const line of this.lines)
        {
            ctx.fillText(
                line,
                20,
                y
            );

            y += 18;
        }

        ctx.restore();
    }
}